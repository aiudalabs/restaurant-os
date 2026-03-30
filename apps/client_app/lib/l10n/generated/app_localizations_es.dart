// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'RestaurantOS';

  @override
  String get open => 'Abierto';

  @override
  String get searchMenu => 'Buscar en el menu...';

  @override
  String get allCategory => 'Todo';

  @override
  String get popular => 'Populares';

  @override
  String get viewCart => 'Ver carrito';

  @override
  String get addToCart => 'Agregar al carrito';

  @override
  String get required => 'Requerido';

  @override
  String get included => 'Incluido';

  @override
  String get quantity => 'Cantidad';

  @override
  String get specialInstructions => 'Instrucciones especiales';

  @override
  String get specialInstructionsHint => 'Ej: sin cebolla, extra salsa...';

  @override
  String get myOrder => 'Mi pedido';

  @override
  String tableN(String number) {
    return 'Mesa $number';
  }

  @override
  String itemsCount(int count) {
    return '$count items';
  }

  @override
  String get kitchenNotes => 'Nota para la cocina (opcional)';

  @override
  String get kitchenNotesHint => 'Ej: sin cebolla en el ceviche...';

  @override
  String get subtotal => 'Subtotal';

  @override
  String taxLabel(String percent) {
    return 'ITBMS ($percent)';
  }

  @override
  String get total => 'Total';

  @override
  String get sendOrder => 'Enviar pedido a cocina';

  @override
  String get emptyCart => 'Tu carrito esta vacio';

  @override
  String get goToMenu => 'Ver menu';

  @override
  String get clearCart => 'Vaciar';

  @override
  String orderNumber(String number) {
    return 'Pedido #$number';
  }

  @override
  String sentAgo(int minutes) {
    return 'Enviado hace $minutes min';
  }

  @override
  String get stepReceived => 'Recibido';

  @override
  String get stepPreparing => 'Preparando';

  @override
  String get stepReady => 'Listo';

  @override
  String get stepDelivered => 'Entregado';

  @override
  String get estimatedWait => 'Tiempo estimado de espera';

  @override
  String get minutes => 'minutos';

  @override
  String get orderItems => 'Items de tu pedido';

  @override
  String get inKitchen => 'En cocina';

  @override
  String get inPreparation => 'En preparacion';

  @override
  String get ready => 'Listo!';

  @override
  String get queued => 'En cola';

  @override
  String get addMoreItems => 'Agregar mas items';

  @override
  String get orderDelivered => 'Pedido entregado';

  @override
  String get thankYou => 'Gracias por tu pedido!';

  @override
  String get tip => 'Propina';

  @override
  String get tax => 'Impuesto';

  @override
  String get orderCancelled => 'Pedido cancelado';

  @override
  String get scanQr => 'Escanea el QR de tu mesa';

  @override
  String get openCamera => 'Abrir camara';

  @override
  String get sessionNotStarted => 'Sesion no iniciada.';

  @override
  String get loadingMenu => 'Cargando menu...';

  @override
  String get errorLoadingMenu => 'Error al cargar el menu';

  @override
  String get errorLoadingProducts => 'Error al cargar productos';

  @override
  String get noCategories => 'No hay categorias disponibles.';

  @override
  String get noProducts => 'No hay productos en esta categoria.';

  @override
  String get productNotFound => 'Producto no encontrado.';

  @override
  String get orderNotFound => 'Pedido no encontrado.';

  @override
  String get errorUnknown => 'Algo salio mal';

  @override
  String get consultStaff => 'Por favor, consulta al personal del restaurante.';

  @override
  String addedToCart(String name) {
    return '$name agregado al carrito';
  }

  @override
  String get errorSendingOrder => 'Error al enviar pedido';

  @override
  String get scanValidQr => 'Escanea un QR valido para acceder al menu.';

  @override
  String get tableNotAvailable => 'Mesa no disponible. Consulta al personal.';

  @override
  String get invalidQr => 'QR invalido para esta sucursal.';

  @override
  String get branchNotFound => 'Sucursal no encontrada.';

  @override
  String get unexpectedError => 'Error inesperado. Intenta de nuevo.';

  @override
  String get mainHall => 'Salon principal';

  @override
  String orderCreated(String time) {
    return 'Pedido realizado: $time';
  }

  @override
  String get confirmed => 'Confirmado';

  @override
  String get products => 'Productos';
}
