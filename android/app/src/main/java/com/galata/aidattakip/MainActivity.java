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
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.rgb(15, 23, 42));
        super.onCreate(savedInstanceState);
        registerPlugin(WhatsAppSharePlugin.class);
        registerPlugin(PdfOpenerPlugin.class);

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
