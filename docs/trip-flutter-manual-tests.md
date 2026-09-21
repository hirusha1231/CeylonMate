# Trip-request Flutter screens

## Files and router integration

- `mobile/lib/features/trips/models/trip.dart` — API response models.
- `mobile/lib/features/trips/services/trip_service.dart` — calls through the shared `ApiClient`.
- `mobile/lib/features/trips/screens/my_trips_screen.dart` — list, pagination, loading/empty/error states.
- `mobile/lib/features/trips/screens/trip_form_screen.dart` — create/edit, validation, dates, profile interests, GPS/manual coordinates.
- `mobile/lib/features/trips/screens/trip_details_screen.dart` — details, status, submit, staff planning.
- `mobile/lib/main.dart` — adds a **My Trips** navigation destination and `/trips/new`, `/trips/details` routes. Pass a trip ID as the argument to `/trips/details`.
- `mobile/pubspec.yaml` and `mobile/android/app/src/main/AndroidManifest.xml` — foreground location dependency/permission.
- `mobile/test/trip_model_test.dart` — response parsing check.

The app has a shared `ApiClient` but no login/token-store UI yet. The auth shell should construct one `ApiClient`, call `updateAuthToken(accessToken)` after login, and pass that same instance to `CeylonMateApp(apiClient: client)`. Without a traveler token, the screen shows the API's sign-in error. Staff can open a submitted trip via `Navigator.pushNamed(context, '/trips/details', arguments: tripId)` to see **Start planning**. The API still enforces authorization.

Run `flutter pub get` from `mobile/` after pulling this change; the regenerated `pubspec.lock` is included. The repository currently has only an Android runner, so iOS location setup is deferred until an iOS runner is added. Geolocator 13.0.2 supports the project's Dart 3.3 lower bound. Only foreground location is requested.

## Six-step manual checklist

1. Start the API with PostgreSQL migrated. In `mobile/`, run `flutter pub get`, then launch the Android app with an authenticated traveler `ApiClient`. Open **My Trips**; verify loading, empty state, and retry behavior when the API is unavailable.
2. Tap **Create Trip**. Try blank objective, reversed dates, zero budget/party size, invalid currency, or only one coordinate. Verify inline validation and no request sent. Pick valid dates with the date pickers.
3. Tap **Use current location**. Grant permission and verify coordinates populate. Deny permission and verify a clear message plus working manual entry. Save a valid draft with accessibility needs and reusable interests; verify it appears in **My Trips**.
4. Open the draft. Verify every field, interests/profile note, `DRAFT` status, and updated timestamp. Edit it, save, reopen, and verify changed values persist.
5. Tap **Submit trip**. Verify `SUBMITTED`, the edit/submit actions disappear, and refresh preserves the state. A different traveler token must not be able to open that trip ID.
6. With a staff token, open the submitted ID through `/trips/details`; tap **Start planning** and verify `PLANNING` and its queued-workflow message. With a traveler token, the staff button must not appear. Confirm no booking/reservation UI or API call occurs.
