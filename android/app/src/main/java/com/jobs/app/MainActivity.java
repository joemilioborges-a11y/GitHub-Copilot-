package com.jobs.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * MainActivity do JOBS para a camada Android nativa (Capacitor).
 *
 * Implementa a proteção FASE 2:
 * Controle dinâmico de WindowManager.LayoutParams.FLAG_SECURE na janela principal via
 * plugin nativo JobsScreenSecurity.
 * - Ativa FLAG_SECURE imediatamente ao abrir qualquer tela ou modal que exibe fotos/vídeos protegidos
 *   (impedindo screenshots, gravações de tela e ocultando a miniatura na lista de apps recentes).
 * - Remove FLAG_SECURE ao sair da visualização protegida, preservando a usabilidade normal nas demais telas.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(JobsScreenSecurityPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @CapacitorPlugin(name = "JobsScreenSecurity")
    public static class JobsScreenSecurityPlugin extends Plugin {

        @PluginMethod
        public void setSecureScreen(PluginCall call) {
            final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
            applyFlagSecure(call, enabled);
        }

        @PluginMethod
        public void enableSecureScreen(PluginCall call) {
            applyFlagSecure(call, true);
        }

        @PluginMethod
        public void disableSecureScreen(PluginCall call) {
            applyFlagSecure(call, false);
        }

        private void applyFlagSecure(final PluginCall call, final boolean enabled) {
            final Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity Android indisponível para aplicar FLAG_SECURE.");
                return;
            }

            activity.runOnUiThread(() -> {
                if (enabled) {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                } else {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
                JSObject ret = new JSObject();
                ret.put("secure", enabled);
                call.resolve(ret);
            });
        }
    }
}
