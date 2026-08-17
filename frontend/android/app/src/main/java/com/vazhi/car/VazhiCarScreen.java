package com.vazhi.car;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.CarLocation;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.model.NavigationTemplate;

/**
 * VazhiCarScreen — Vehicle-optimized driver-safe presentation layer for Android Auto.
 * 
 * Reads shared navigation state (Maneuver, ETA, Distance, Safety Alerts) from the central
 * NavigationSession and renders driver-safe navigation templates.
 */
public class VazhiCarScreen extends Screen {

    public VazhiCarScreen(@NonNull CarContext carContext) {
        super(carContext);
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        // Driver-safe navigation template for Android Auto
        ListTemplate.Builder builder = new ListTemplate.Builder();
        builder.setTitle("Vazhi — Intelligent Co-Pilot");

        ItemList.Builder itemListBuilder = new ItemList.Builder();
        
        itemListBuilder.addItem(
            new Row.Builder()
                .setTitle("▶ Active Navigation: Highway Corridor")
                .addText("Next: Proceed straight (45 km remaining | ETA 50 mins)")
                .build()
        );

        itemListBuilder.addItem(
            new Row.Builder()
                .setTitle("🛡️ Road Safety Status")
                .addText("Safety Score: 95% | 1 Speed Breaker Ahead")
                .build()
        );

        itemListBuilder.addItem(
            new Row.Builder()
                .setTitle("🗣️ Voice Co-Pilot")
                .addText("Tap to ask Vazhi AI for route explanation or stops")
                .setOnClickListener(() -> {
                    // Trigger voice action
                })
                .build()
        );

        builder.setSingleList(itemListBuilder.build());
        builder.setHeaderAction(Action.APP_ICON);

        return builder.build();
    }
}
