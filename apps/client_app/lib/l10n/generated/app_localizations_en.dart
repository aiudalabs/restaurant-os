// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'RestaurantOS';

  @override
  String get open => 'Open';

  @override
  String get searchMenu => 'Search the menu...';

  @override
  String get allCategory => 'All';

  @override
  String get popular => 'Popular';

  @override
  String get viewCart => 'View cart';

  @override
  String get addToCart => 'Add to cart';

  @override
  String get required => 'Required';

  @override
  String get included => 'Included';

  @override
  String get quantity => 'Quantity';

  @override
  String get specialInstructions => 'Special instructions';

  @override
  String get specialInstructionsHint => 'E.g.: no onion, extra sauce...';

  @override
  String get myOrder => 'My order';

  @override
  String tableN(String number) {
    return 'Table $number';
  }

  @override
  String itemsCount(int count) {
    return '$count items';
  }

  @override
  String get kitchenNotes => 'Kitchen note (optional)';

  @override
  String get kitchenNotesHint => 'E.g.: no onion in the ceviche...';

  @override
  String get subtotal => 'Subtotal';

  @override
  String taxLabel(String percent) {
    return 'Tax ($percent)';
  }

  @override
  String get total => 'Total';

  @override
  String get sendOrder => 'Send order to kitchen';

  @override
  String get emptyCart => 'Your cart is empty';

  @override
  String get goToMenu => 'View menu';

  @override
  String get clearCart => 'Clear';

  @override
  String orderNumber(String number) {
    return 'Order #$number';
  }

  @override
  String sentAgo(int minutes) {
    return 'Sent $minutes min ago';
  }

  @override
  String get stepReceived => 'Received';

  @override
  String get stepPreparing => 'Preparing';

  @override
  String get stepReady => 'Ready';

  @override
  String get stepDelivered => 'Delivered';

  @override
  String get estimatedWait => 'Estimated wait time';

  @override
  String get minutes => 'minutes';

  @override
  String get orderItems => 'Your order items';

  @override
  String get inKitchen => 'In kitchen';

  @override
  String get inPreparation => 'In preparation';

  @override
  String get ready => 'Ready!';

  @override
  String get queued => 'Queued';

  @override
  String get addMoreItems => 'Add more items';

  @override
  String get orderDelivered => 'Order delivered';

  @override
  String get thankYou => 'Thank you for your order!';

  @override
  String get tip => 'Tip';

  @override
  String get tax => 'Tax';

  @override
  String get orderCancelled => 'Order cancelled';

  @override
  String get scanQr => 'Scan your table QR code';

  @override
  String get openCamera => 'Open camera';

  @override
  String get sessionNotStarted => 'Session not started.';

  @override
  String get loadingMenu => 'Loading menu...';

  @override
  String get errorLoadingMenu => 'Error loading menu';

  @override
  String get errorLoadingProducts => 'Error loading products';

  @override
  String get noCategories => 'No categories available.';

  @override
  String get noProducts => 'No products in this category.';

  @override
  String get productNotFound => 'Product not found.';

  @override
  String get orderNotFound => 'Order not found.';

  @override
  String get errorUnknown => 'Something went wrong';

  @override
  String get consultStaff => 'Please ask the restaurant staff.';

  @override
  String addedToCart(String name) {
    return '$name added to cart';
  }

  @override
  String get errorSendingOrder => 'Error sending order';

  @override
  String get scanValidQr => 'Scan a valid QR to access the menu.';

  @override
  String get tableNotAvailable => 'Table not available. Ask the staff.';

  @override
  String get invalidQr => 'Invalid QR for this location.';

  @override
  String get branchNotFound => 'Branch not found.';

  @override
  String get unexpectedError => 'Unexpected error. Try again.';

  @override
  String get mainHall => 'Main hall';

  @override
  String orderCreated(String time) {
    return 'Order placed: $time';
  }

  @override
  String get confirmed => 'Confirmed';

  @override
  String get products => 'Products';
}
