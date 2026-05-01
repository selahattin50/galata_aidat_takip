package com.galata.aidattakip;

import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import java.io.File;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.rgb(15, 23, 42));
        super.onCreate(savedInstanceState);
        registerPlugin(WhatsAppSharePlugin.class);
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
