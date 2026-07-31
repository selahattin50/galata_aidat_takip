package com.galata.aidattakip;

import android.content.ClipData;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ListView;
import androidx.appcompat.app.AlertDialog;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WhatsAppSharePlugin.class);
        registerPlugin(PdfOpenerPlugin.class);
        registerPlugin(CredentialStorePlugin.class);
        registerPlugin(NativeAppControlPlugin.class);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.rgb(15, 23, 42));
        super.onCreate(savedInstanceState);
        bridge.getWebView().setBackgroundColor(Color.rgb(3, 7, 18));

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null) {
                    bridge.triggerWindowJSEvent("galata:native-back-button");
                }
            }
        });
    }
}

@CapacitorPlugin(name = "NativeAppControl")
class NativeAppControlPlugin extends Plugin {
    @PluginMethod
    public void closeAndRemoveTask(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            call.resolve();
            getActivity().finishAndRemoveTask();
        });
    }
}

@CapacitorPlugin(name = "CredentialStore")
class CredentialStorePlugin extends Plugin {
    private static final String KEY_ALIAS = "galata_login_credentials_key";
    private static final String PREFS_NAME = "galata_secure_credentials";
    private static final String EMAIL_KEY = "email";
    private static final String PASSWORD_KEY = "password";

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        }

        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        keyGenerator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return keyGenerator.generateKey();
    }

    private String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
            + ":"
            + Base64.encodeToString(encrypted, Base64.NO_WRAP);
    }

    private String decrypt(String value) throws Exception {
        String[] parts = value.split(":", 2);
        if (parts.length != 2) throw new IllegalArgumentException("Invalid credential data");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateKey(),
            new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP))
        );
        byte[] decrypted = cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP));
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void save(PluginCall call) {
        String email = call.getString("email", "");
        String password = call.getString("password", "");
        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Email and password are required");
            return;
        }

        try {
            boolean saved = getContext().getSharedPreferences(PREFS_NAME, 0)
                .edit()
                .putString(EMAIL_KEY, encrypt(email))
                .putString(PASSWORD_KEY, encrypt(password))
                .commit();
            if (!saved) {
                call.reject("Credentials could not be written");
                return;
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("Credentials could not be saved", error);
        }
    }

    @PluginMethod
    public void load(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS_NAME, 0);
        String encryptedEmail = preferences.getString(EMAIL_KEY, "");
        String encryptedPassword = preferences.getString(PASSWORD_KEY, "");
        JSObject result = new JSObject();

        if (encryptedEmail.isEmpty() || encryptedPassword.isEmpty()) {
            result.put("email", "");
            result.put("password", "");
            call.resolve(result);
            return;
        }

        try {
            result.put("email", decrypt(encryptedEmail));
            result.put("password", decrypt(encryptedPassword));
            call.resolve(result);
        } catch (Exception error) {
            preferences.edit().clear().apply();
            call.reject("Credentials could not be loaded", error);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        getContext().getSharedPreferences(PREFS_NAME, 0).edit().clear().apply();
        call.resolve();
    }
}

@CapacitorPlugin(name = "PdfOpener")
class PdfOpenerPlugin extends Plugin {
    private static final String PREFS_NAME = "galata_pdf_opener";
    private static final String DEFAULT_TARGET_KEY = "default_pdf_target";

    private static class PdfTarget {
        String label;
        String packageName;
        String activityName;
        String action;

        PdfTarget(String label, String packageName, String activityName, String action) {
            this.label = label;
            this.packageName = packageName;
            this.activityName = activityName;
            this.action = action;
        }
    }

    private Uri getOpenUri(String filePath) {
        Uri fileUri = Uri.parse(filePath);
        if (filePath.startsWith("file://")) {
            String path = filePath.replace("file://", "");
            File file = new File(path);
            return FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
        }
        return fileUri;
    }

    private Intent buildIntent(Uri fileUri, String mimeType, PdfTarget target) {
        String resolvedMimeType = (mimeType == null || mimeType.isEmpty()) ? "application/pdf" : mimeType;
        String action = target == null || target.action == null || target.action.isEmpty()
            ? Intent.ACTION_VIEW
            : target.action;
        Intent intent = new Intent(action);

        if (Intent.ACTION_SEND.equals(action)) {
            intent.setType(resolvedMimeType);
            intent.putExtra(Intent.EXTRA_STREAM, fileUri);
        } else {
            intent.setDataAndType(fileUri, resolvedMimeType);
        }

        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setClipData(ClipData.newRawUri("pdf", fileUri));

        if (target != null && target.packageName != null && !target.packageName.isEmpty()) {
            if (target.activityName != null && !target.activityName.isEmpty()) {
                intent.setComponent(new ComponentName(target.packageName, target.activityName));
            } else {
                intent.setPackage(target.packageName);
            }
            getContext().grantUriPermission(target.packageName, fileUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        return intent;
    }

    private boolean openWithTarget(Uri fileUri, String mimeType, PdfTarget target) {
        try {
            getActivity().startActivity(buildIntent(fileUri, mimeType, target));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private PdfTarget parseTarget(String value) {
        if (value == null || value.isEmpty()) return null;
        String[] parts = value.split("\\|", -1);
        if (parts.length < 3) return null;
        return new PdfTarget("", parts[0], parts[1], parts[2]);
    }

    private String serializeTarget(PdfTarget target) {
        return target.packageName + "|" + target.activityName + "|" + target.action;
    }

    private void addTargets(LinkedHashMap<String, PdfTarget> targets, Intent queryIntent, String action, PackageManager packageManager) {
        List<ResolveInfo> apps = packageManager.queryIntentActivities(queryIntent, 0);
        if (apps == null) return;

        for (ResolveInfo app : apps) {
            if (app.activityInfo == null) continue;
            String packageName = app.activityInfo.packageName;
            String activityName = app.activityInfo.name;
            String key = packageName + "|" + activityName + "|" + action;
            if (targets.containsKey(key)) continue;

            String label = app.loadLabel(packageManager).toString();
            targets.put(key, new PdfTarget(label, packageName, activityName, action));
        }
    }

    private ArrayList<PdfTarget> getPdfTargets(Uri fileUri, String mimeType) {
        String resolvedMimeType = (mimeType == null || mimeType.isEmpty()) ? "application/pdf" : mimeType;
        PackageManager packageManager = getContext().getPackageManager();
        LinkedHashMap<String, PdfTarget> targets = new LinkedHashMap<>();

        Intent viewIntent = new Intent(Intent.ACTION_VIEW);
        viewIntent.setDataAndType(fileUri, resolvedMimeType);
        viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        addTargets(targets, viewIntent, Intent.ACTION_VIEW, packageManager);

        Intent sendIntent = new Intent(Intent.ACTION_SEND);
        sendIntent.setType(resolvedMimeType);
        sendIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
        sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        addTargets(targets, sendIntent, Intent.ACTION_SEND, packageManager);

        return new ArrayList<>(targets.values());
    }

    private void showPdfChooser(PluginCall call, Uri fileUri, String mimeType) {
        PackageManager packageManager = getContext().getPackageManager();
        ArrayList<PdfTarget> apps = getPdfTargets(fileUri, mimeType);

        if (apps == null || apps.isEmpty()) {
            call.reject("PDF açacak uygulama bulunamadı");
            return;
        }

        String[] labels = new String[apps.size()];
        for (int i = 0; i < apps.size(); i++) {
            labels[i] = apps.get(i).label;
        }

        getActivity().runOnUiThread(() -> {
            CheckBox alwaysUse = new CheckBox(getActivity());
            alwaysUse.setText("Her zaman bu uygulamayla aç");
            alwaysUse.setPadding(36, 18, 36, 18);

            ListView listView = new ListView(getActivity());
            listView.setAdapter(new ArrayAdapter<>(getActivity(), android.R.layout.simple_list_item_1, labels));

            LinearLayout layout = new LinearLayout(getActivity());
            layout.setOrientation(LinearLayout.VERTICAL);
            layout.addView(alwaysUse);
            layout.addView(listView);

            AlertDialog dialog = new AlertDialog.Builder(getActivity())
                .setTitle("PDF uygulaması seç")
                .setView(layout)
                .setNegativeButton("İptal", (d, which) -> call.reject("cancelled"))
                .create();

            listView.setOnItemClickListener((parent, view, position, id) -> {
                PdfTarget selected = apps.get(position);

                if (alwaysUse.isChecked()) {
                    getContext()
                        .getSharedPreferences(PREFS_NAME, 0)
                        .edit()
                        .putString(DEFAULT_TARGET_KEY, serializeTarget(selected))
                        .apply();
                }

                dialog.dismiss();
                if (openWithTarget(fileUri, mimeType, selected)) {
                    call.resolve();
                } else {
                    call.reject("Seçilen uygulama PDF'i açamadı");
                }
            });

            dialog.setOnCancelListener(d -> call.reject("cancelled"));
            dialog.show();
        });
    }

    @PluginMethod
    public void open(PluginCall call) {
        String filePath = call.getString("filePath");
        String mimeType = call.getString("contentType", "application/pdf");

        if (filePath == null || filePath.isEmpty()) {
            call.reject("filePath is required");
            return;
        }

        try {
            Uri fileUri = getOpenUri(filePath);
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
            PdfTarget savedTarget = parseTarget(prefs.getString(DEFAULT_TARGET_KEY, ""));

            if (savedTarget != null) {
                if (openWithTarget(fileUri, mimeType, savedTarget)) {
                    call.resolve();
                    return;
                }

                prefs.edit().remove(DEFAULT_TARGET_KEY).apply();
            }

            showPdfChooser(call, fileUri, mimeType);
        } catch (Exception e) {
            call.reject("PDF açılamadı: " + e.getMessage());
        }
    }
}

@CapacitorPlugin(name = "WhatsAppShare")
class WhatsAppSharePlugin extends Plugin {
    private String normalizePhone(String phoneNumber) {
        String cleanPhone = phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
        if (cleanPhone.startsWith("00")) {
            cleanPhone = cleanPhone.substring(2);
        }
        if (cleanPhone.startsWith("0")) {
            cleanPhone = "90" + cleanPhone.substring(1);
        }
        if (cleanPhone.length() == 10) {
            cleanPhone = "90" + cleanPhone;
        }
        if (!cleanPhone.startsWith("90") && cleanPhone.length() > 0) {
            cleanPhone = "90" + cleanPhone;
        }
        return cleanPhone;
    }

    private String getInstalledWhatsAppPackage() {
        String[] packages = {"com.whatsapp", "com.whatsapp.w4b"};
        for (String pkg : packages) {
            try {
                getContext().getPackageManager().getPackageInfo(pkg, 0);
                return pkg;
            } catch (Exception e) {
                // Try the next WhatsApp package.
            }
        }
        return null;
    }

    private Uri getShareUri(String filePath) {
        Uri fileUri = Uri.parse(filePath);
        if (filePath.startsWith("file://")) {
            String path = filePath.replace("file://", "");
            File file = new File(path);
            fileUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
        }
        return fileUri;
    }

    private Intent buildImageIntent(String targetPackage, Uri fileUri, String mimeType, String text, String jid) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setPackage(targetPackage);
        intent.setType((mimeType == null || mimeType.isEmpty()) ? "image/png" : mimeType);
        intent.putExtra(Intent.EXTRA_STREAM, fileUri);

        if (text != null && !text.isEmpty()) {
            intent.putExtra(Intent.EXTRA_TEXT, text);
        }

        if (jid != null && !jid.isEmpty()) {
            intent.putExtra("jid", jid);
            intent.putExtra("chat_id", jid);
        }

        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setClipData(ClipData.newRawUri("share", fileUri));
        getContext().grantUriPermission(targetPackage, fileUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    @PluginMethod
    public void shareToWhatsApp(PluginCall call) {
        String phoneNumber = normalizePhone(call.getString("phoneNumber"));
        String filePath = call.getString("filePath");
        String text = call.getString("text", "");
        String mimeType = call.getString("mimeType", "image/png");

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }

        try {
            Uri fileUri = getShareUri(filePath);
            String targetPackage = getInstalledWhatsAppPackage();

            if (targetPackage == null) {
                call.reject("WhatsApp is not installed");
                return;
            }

            String jid = phoneNumber + "@s.whatsapp.net";
            Intent directIntent = buildImageIntent(targetPackage, fileUri, mimeType, text, jid);

            getActivity().startActivity(directIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error: " + e.getMessage());
        }
    }
}
