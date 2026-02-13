package com.galata.aidattakip;

import android.os.Bundle;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    private long backPressedTime = 0;
    private static final int BACK_PRESS_INTERVAL = 2000; // 2 saniye
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Geri tuşu callback'i
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // JavaScript'e mesaj gönder
                getBridge().triggerJSEvent("backbutton", "window");
                
                // Eğer JavaScript handle etmezse, varsayılan davranış
                // 2 saniye içinde tekrar basılırsa çık
                long currentTime = System.currentTimeMillis();
                if (currentTime - backPressedTime < BACK_PRESS_INTERVAL) {
                    // Çıkış yap
                    finishAffinity();
                } else {
                    // İlk basış - uyarı göster
                    backPressedTime = currentTime;
                    Toast.makeText(MainActivity.this, "Çıkmak için tekrar basın", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}
