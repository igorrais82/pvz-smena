package ru.igorrais82.pvz;

import android.webkit.JavascriptInterface;

/**
 * Мост «игра ↔ Android» для рекламы, платежей и вибрации.
 *
 * Игра ищет ровно этот объект: window.PVZNative.
 * JS-сторона: game/src/ads.js (PVZ.ads) и game/src/pay.js (PVZ.pay).
 *
 * Как только в проект добавлен SDK рекламы или RuStore Pay SDK, достаточно
 * переопределить методы хоста (MainActivity):
 *   isAdsAvailable()      → true, когда реклама инициализирована;
 *   showRewarded(id, tag) → показ ролика, по завершении вызвать host.adResult(...);
 *   isBillingAvailable()  → true, когда Pay SDK готов;
 *   purchase(id, json)    → запуск покупки, по завершении host.billingResult(...).
 *
 * Пока SDK нет, методы честно возвращают «не подключено» — игра не выдаёт
 * платные товары и не начисляет монеты за несуществующий ролик.
 */
public class PvzBridge {

    private final MainActivity host;

    PvzBridge(MainActivity host) {
        this.host = host;
    }

    @JavascriptInterface
    public String platform() {
        return "android";
    }

    @JavascriptInterface
    public String adsAvailable() {
        return host.isAdsAvailable() ? "true" : "false";
    }

    @JavascriptInterface
    public void showRewarded(String id, String tag) {
        host.showRewarded(id, tag);
    }

    @JavascriptInterface
    public String billingAvailable() {
        return host.isBillingAvailable() ? "true" : "false";
    }

    @JavascriptInterface
    public void purchase(String id, String json) {
        host.purchase(id, json);
    }

    @JavascriptInterface
    public void vibrate(int ms) {
        host.vibrate(ms);
    }
}
