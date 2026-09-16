# Shared Flutter authentication shell

## Files

- `mobile/lib/main.dart`: protected app entry, login, role-aware home and logout UI.
- `mobile/lib/core/auth/auth_user.dart`: `/api/auth/me` user model.
- `mobile/lib/core/auth/token_store.dart`: secure JWT persistence abstraction.
- `mobile/lib/core/auth/auth_repository.dart`: login, restore via `/me`, and local logout.
- `mobile/lib/core/auth/auth_controller.dart`: loading, error and signed-in state.
- `mobile/lib/core/network/api_client.dart`: existing shared Dio client; credential/header/response logging removed.
- `mobile/pubspec.yaml`: `flutter_secure_storage: 10.3.4`.
- `mobile/android/app/build.gradle.kts`: Android minimum SDK 23.
- `mobile/android/app/src/main/AndroidManifest.xml`: disable Android backup of secure-storage material.
- `mobile/test/auth_shell_test.dart`: protected startup, login/logout and role tests.

The prior guide and traveler demo widgets remain in the repository, but the shell does not automatically expose a hard-coded guide ID or mock feasibility data. `/traveler` and `/guide` are guarded role routes; future feature routing should consume the one authenticated `ApiClient` and use the verified `/me` user role. A local logout removes the JWT; since the backend uses stateless JWTs, it does not revoke a copied token server-side.

## Setup and test

From `mobile/` run:

```powershell
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5084
```

`10.0.2.2` reaches a host API from the Android emulator. Use your computer's LAN address for a physical device. The API and PostgreSQL must be running, with a JWT signing key configured through the API environment; do not put it in the mobile app.

Manual checks:

1. Launch with no saved session: see login, not a business home.
2. Submit blank/invalid fields: see validation; submit wrong credentials: see an error without a token in logs.
3. Log in as a `TRAVELER`: see Traveler Home. Restart the app: `/api/auth/me` restores the session.
4. Log out: return to login. Restart: remain logged out.
5. Log in as a `LOCAL_GUIDE`: see Local Guide Home. Other roles get an unsupported-role message and logout only.
6. Disable the API while a token is saved, restart: see Retry/Sign out, not protected content. Restore the API and tap Retry.

The repository has no iOS runner at present. When one is added, configure the platform's Keychain capabilities as required by `flutter_secure_storage`.
