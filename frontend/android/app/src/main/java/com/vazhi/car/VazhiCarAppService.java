package com.vazhi.car;

import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;

/**
 * VazhiCarAppService — Entry point for Android Auto / Android for Cars App Library.
 * 
 * Binds the vehicle head-unit display to the central Vazhi NavigationSession.
 */
public class VazhiCarAppService extends CarAppService {

    @NonNull
    @Override
    public HostValidator createHostValidator() {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @NonNull
    @Override
    public Session onCreateSession() {
        return new Session() {
            @NonNull
            @Override
            public androidx.car.app.Screen onCreateScreen(@NonNull android.content.Intent intent) {
                return new VazhiCarScreen(getCarContext());
            }
        };
    }
}
