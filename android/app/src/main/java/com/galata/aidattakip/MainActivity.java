package com.galata.aidattakip;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.content.FileProvider;
import java.io.File;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(WhatsAppSharePlugin.class);
    }
}

@CapacitorPlugin(name = "WhatsAppShare")
class WhatsAppSharePlugin extends Plugin {
    
    @PluginMethod
    public void shareToWhatsApp(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String filePath = call.getString("filePath");
        String mimeType = call.getString("mimeType", "application/pdf");
        
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }
        
        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }
        
        try {
            // Dosya URI'sini parse et
            Uri fileUri = Uri.parse(filePath);
            
            // Eğer file:// ile başlıyorsa, FileProvider kullan
            if (filePath.startsWith("file://")) {
                String path = filePath.replace("file://", "");
                File file = new File(path);
                fileUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
                );
            }
            
            // WhatsApp intent oluştur
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mimeType);
            intent.setPackage("com.whatsapp");
            intent.putExtra(Intent.EXTRA_STREAM, fileUri);
            intent.putExtra("jid", phoneNumber + "@s.whatsapp.net");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            
            // WhatsApp yüklü mü kontrol et
            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                getActivity().startActivity(intent);
                call.resolve();
            } else {
                call.reject("WhatsApp is not installed");
            }
        } catch (Exception e) {
            call.reject("Error sharing to WhatsApp: " + e.getMessage());
        }
    }
}
