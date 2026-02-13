package com.galata.aidattakip;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Geri tuşu callback'i
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // JavaScript'e mesaj gönder
                getBridge().triggerJSEvent("backbutton", "window");
                
                // Eğer JavaScript handle etmezse, direkt çık
                finishAffinity();
            }
        });
    }
}
