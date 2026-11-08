package io.github.omar_elwazeery.lyricpost;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugin: Gallery save + direct share to installed apps.
        registerPlugin(SocialSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
