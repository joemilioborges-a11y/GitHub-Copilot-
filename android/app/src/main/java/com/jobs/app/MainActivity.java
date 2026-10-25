package com.jobs.app;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity do JOBS para a camada Android nativa.
 * 
 * Implementa a proteção FASE 2:
 * Aplicação estrita de WindowManager.LayoutParams.FLAG_SECURE na janela principal.
 * Impede que o sistema operacional Android realize capturas de tela (screenshots),
 * gravações de tela (screen recording) e oculta o conteúdo em miniaturas do
 * alternador de aplicativos recentes (task switcher).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Ativa FLAG_SECURE para proteção contra captura e espelhamento não autorizado
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
