import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../repositories/order_repository.dart';
import '../repositories/order_item_repository.dart';
import '../repositories/menu_repository.dart';
import '../repositories/table_repository.dart';
import '../repositories/station_repository.dart';
import '../repositories/user_repository.dart';
import 'firebase_providers.dart';

part 'repository_providers.g.dart';

@riverpod
OrderRepository orderRepository(OrderRepositoryRef ref) =>
    OrderRepository(ref.watch(firestoreProvider));

@riverpod
OrderItemRepository orderItemRepository(OrderItemRepositoryRef ref) =>
    OrderItemRepository(ref.watch(firestoreProvider));

@riverpod
MenuRepository menuRepository(MenuRepositoryRef ref) =>
    MenuRepository(ref.watch(firestoreProvider));

@riverpod
TableRepository tableRepository(TableRepositoryRef ref) =>
    TableRepository(ref.watch(firestoreProvider));

@riverpod
StationRepository stationRepository(StationRepositoryRef ref) =>
    StationRepository(ref.watch(firestoreProvider));

@riverpod
UserRepository userRepository(UserRepositoryRef ref) =>
    UserRepository(ref.watch(firestoreProvider));
