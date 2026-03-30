import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'kds_settings_provider.g.dart';

@Riverpod(keepAlive: true)
class KdsSettings extends _$KdsSettings {
  static const _volumeKey = 'kds_volume';

  @override
  Future<double> build() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getDouble(_volumeKey) ?? 0.8;
  }

  Future<void> setVolume(double volume) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_volumeKey, volume);
    state = AsyncData(volume);
  }
}
