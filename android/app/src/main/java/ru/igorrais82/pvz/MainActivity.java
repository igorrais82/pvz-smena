package ru.igorrais82.pvz;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

/**
 * Тонкая WebView-обёртка вокруг игры «ПВЗ: Смена».
 * Игра — статический офлайн-сайт в assets/game, поэтому контейнеру нужны только
 * JavaScript, DOM Storage (сохранения), звук без жеста и проброс кнопки «Назад».
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/game/index.html";
    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#120e0c"));
        // в релизе не оставляем удалённую отладку WebView
        WebView.setWebContentsDebuggingEnabled(false);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("file".equals(scheme)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new PvzBridge(this), "PVZNative");

        setContentView(web);
        web.loadUrl(START_URL);
        hideSystemUi();
    }

    /* ---------------- реклама, платежи, вибрация ---------------- */
    /* Пока SDK не подключён, оба флага false: игра честно пишет
       «реклама недоступна» и не показывает покупки за рубли.
       Инструкция и готовый код — в RELEASE-RUSTORE.md. */

    private boolean adsReady = false;
    private boolean billingReady = false;

    public boolean isAdsAvailable() {
        return adsReady;
    }

    public boolean isBillingAvailable() {
        return billingReady;
    }

    /** Показ rewarded-ролика. Замените тело на вызов вашего SDK. */
    public void showRewarded(String id, String tag) {
        adResult(id, "error", "Рекламный SDK не подключён");
    }

    /** Запуск покупки. Замените тело на вызов RuStore Pay SDK. */
    public void purchase(String id, String json) {
        billingResult(id, "{\"status\":\"error\",\"error\":\"Платежи не подключены\"}");
    }

    /** Результат ролика: status = completed | skipped | error. */
    public void adResult(String id, String status, String error) {
        evalJs("window.PVZ&&PVZ.ads&&PVZ.ads.onResult(" +
                JSONObject.quote(id) + "," + JSONObject.quote(status) + "," +
                JSONObject.quote(error == null ? "" : error) + ")");
    }

    /** Результат покупки: JSON-строка для PVZ.pay.onNativePurchase. */
    public void billingResult(String id, String json) {
        evalJs("window.PVZ&&PVZ.pay&&PVZ.pay.onNativePurchase(" +
                JSONObject.quote(id) + "," + JSONObject.quote(json == null ? "{}" : json) + ")");
    }

    private void evalJs(final String js) {
        if (web == null) return;
        web.post(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.evaluateJavascript(js, null);
            }
        });
    }

    public void vibrate(int ms) {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) v.vibrate(Math.max(1, Math.min(ms, 120)));
        } catch (Exception ignored) {
        }
    }

    private void hideSystemUi() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.resumeTimers();
            web.onResume();
        }
        hideSystemUi();
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.onPause();
            web.pauseTimers();
        }
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript(
                "(function(){try{return (window.PVZ&&PVZ.game&&PVZ.game.onAndroidBack)?PVZ.game.onAndroidBack():'exit';}catch(e){return 'exit';}})()",
                value -> {
                    if (value == null || value.contains("exit")) {
                        finish();
                    }
                });
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("PVZNative");
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
