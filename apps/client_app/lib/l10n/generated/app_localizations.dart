import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es')
  ];

  /// No description provided for @appTitle.
  ///
  /// In es, this message translates to:
  /// **'RestaurantOS'**
  String get appTitle;

  /// No description provided for @open.
  ///
  /// In es, this message translates to:
  /// **'Abierto'**
  String get open;

  /// No description provided for @searchMenu.
  ///
  /// In es, this message translates to:
  /// **'Buscar en el menu...'**
  String get searchMenu;

  /// No description provided for @allCategory.
  ///
  /// In es, this message translates to:
  /// **'Todo'**
  String get allCategory;

  /// No description provided for @popular.
  ///
  /// In es, this message translates to:
  /// **'Populares'**
  String get popular;

  /// No description provided for @viewCart.
  ///
  /// In es, this message translates to:
  /// **'Ver carrito'**
  String get viewCart;

  /// No description provided for @addToCart.
  ///
  /// In es, this message translates to:
  /// **'Agregar al carrito'**
  String get addToCart;

  /// No description provided for @required.
  ///
  /// In es, this message translates to:
  /// **'Requerido'**
  String get required;

  /// No description provided for @included.
  ///
  /// In es, this message translates to:
  /// **'Incluido'**
  String get included;

  /// No description provided for @quantity.
  ///
  /// In es, this message translates to:
  /// **'Cantidad'**
  String get quantity;

  /// No description provided for @specialInstructions.
  ///
  /// In es, this message translates to:
  /// **'Instrucciones especiales'**
  String get specialInstructions;

  /// No description provided for @specialInstructionsHint.
  ///
  /// In es, this message translates to:
  /// **'Ej: sin cebolla, extra salsa...'**
  String get specialInstructionsHint;

  /// No description provided for @myOrder.
  ///
  /// In es, this message translates to:
  /// **'Mi pedido'**
  String get myOrder;

  /// No description provided for @tableN.
  ///
  /// In es, this message translates to:
  /// **'Mesa {number}'**
  String tableN(String number);

  /// No description provided for @itemsCount.
  ///
  /// In es, this message translates to:
  /// **'{count} items'**
  String itemsCount(int count);

  /// No description provided for @kitchenNotes.
  ///
  /// In es, this message translates to:
  /// **'Nota para la cocina (opcional)'**
  String get kitchenNotes;

  /// No description provided for @kitchenNotesHint.
  ///
  /// In es, this message translates to:
  /// **'Ej: sin cebolla en el ceviche...'**
  String get kitchenNotesHint;

  /// No description provided for @subtotal.
  ///
  /// In es, this message translates to:
  /// **'Subtotal'**
  String get subtotal;

  /// No description provided for @taxLabel.
  ///
  /// In es, this message translates to:
  /// **'ITBMS ({percent})'**
  String taxLabel(String percent);

  /// No description provided for @total.
  ///
  /// In es, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @sendOrder.
  ///
  /// In es, this message translates to:
  /// **'Enviar pedido a cocina'**
  String get sendOrder;

  /// No description provided for @emptyCart.
  ///
  /// In es, this message translates to:
  /// **'Tu carrito esta vacio'**
  String get emptyCart;

  /// No description provided for @goToMenu.
  ///
  /// In es, this message translates to:
  /// **'Ver menu'**
  String get goToMenu;

  /// No description provided for @clearCart.
  ///
  /// In es, this message translates to:
  /// **'Vaciar'**
  String get clearCart;

  /// No description provided for @orderNumber.
  ///
  /// In es, this message translates to:
  /// **'Pedido #{number}'**
  String orderNumber(String number);

  /// No description provided for @sentAgo.
  ///
  /// In es, this message translates to:
  /// **'Enviado hace {minutes} min'**
  String sentAgo(int minutes);

  /// No description provided for @stepReceived.
  ///
  /// In es, this message translates to:
  /// **'Recibido'**
  String get stepReceived;

  /// No description provided for @stepPreparing.
  ///
  /// In es, this message translates to:
  /// **'Preparando'**
  String get stepPreparing;

  /// No description provided for @stepReady.
  ///
  /// In es, this message translates to:
  /// **'Listo'**
  String get stepReady;

  /// No description provided for @stepDelivered.
  ///
  /// In es, this message translates to:
  /// **'Entregado'**
  String get stepDelivered;

  /// No description provided for @estimatedWait.
  ///
  /// In es, this message translates to:
  /// **'Tiempo estimado de espera'**
  String get estimatedWait;

  /// No description provided for @minutes.
  ///
  /// In es, this message translates to:
  /// **'minutos'**
  String get minutes;

  /// No description provided for @orderItems.
  ///
  /// In es, this message translates to:
  /// **'Items de tu pedido'**
  String get orderItems;

  /// No description provided for @inKitchen.
  ///
  /// In es, this message translates to:
  /// **'En cocina'**
  String get inKitchen;

  /// No description provided for @inPreparation.
  ///
  /// In es, this message translates to:
  /// **'En preparacion'**
  String get inPreparation;

  /// No description provided for @ready.
  ///
  /// In es, this message translates to:
  /// **'Listo!'**
  String get ready;

  /// No description provided for @queued.
  ///
  /// In es, this message translates to:
  /// **'En cola'**
  String get queued;

  /// No description provided for @addMoreItems.
  ///
  /// In es, this message translates to:
  /// **'Agregar mas items'**
  String get addMoreItems;

  /// No description provided for @orderDelivered.
  ///
  /// In es, this message translates to:
  /// **'Pedido entregado'**
  String get orderDelivered;

  /// No description provided for @thankYou.
  ///
  /// In es, this message translates to:
  /// **'Gracias por tu pedido!'**
  String get thankYou;

  /// No description provided for @tip.
  ///
  /// In es, this message translates to:
  /// **'Propina'**
  String get tip;

  /// No description provided for @tax.
  ///
  /// In es, this message translates to:
  /// **'Impuesto'**
  String get tax;

  /// No description provided for @orderCancelled.
  ///
  /// In es, this message translates to:
  /// **'Pedido cancelado'**
  String get orderCancelled;

  /// No description provided for @scanQr.
  ///
  /// In es, this message translates to:
  /// **'Escanea el QR de tu mesa'**
  String get scanQr;

  /// No description provided for @openCamera.
  ///
  /// In es, this message translates to:
  /// **'Abrir camara'**
  String get openCamera;

  /// No description provided for @sessionNotStarted.
  ///
  /// In es, this message translates to:
  /// **'Sesion no iniciada.'**
  String get sessionNotStarted;

  /// No description provided for @loadingMenu.
  ///
  /// In es, this message translates to:
  /// **'Cargando menu...'**
  String get loadingMenu;

  /// No description provided for @errorLoadingMenu.
  ///
  /// In es, this message translates to:
  /// **'Error al cargar el menu'**
  String get errorLoadingMenu;

  /// No description provided for @errorLoadingProducts.
  ///
  /// In es, this message translates to:
  /// **'Error al cargar productos'**
  String get errorLoadingProducts;

  /// No description provided for @noCategories.
  ///
  /// In es, this message translates to:
  /// **'No hay categorias disponibles.'**
  String get noCategories;

  /// No description provided for @noProducts.
  ///
  /// In es, this message translates to:
  /// **'No hay productos en esta categoria.'**
  String get noProducts;

  /// No description provided for @productNotFound.
  ///
  /// In es, this message translates to:
  /// **'Producto no encontrado.'**
  String get productNotFound;

  /// No description provided for @orderNotFound.
  ///
  /// In es, this message translates to:
  /// **'Pedido no encontrado.'**
  String get orderNotFound;

  /// No description provided for @errorUnknown.
  ///
  /// In es, this message translates to:
  /// **'Algo salio mal'**
  String get errorUnknown;

  /// No description provided for @consultStaff.
  ///
  /// In es, this message translates to:
  /// **'Por favor, consulta al personal del restaurante.'**
  String get consultStaff;

  /// No description provided for @addedToCart.
  ///
  /// In es, this message translates to:
  /// **'{name} agregado al carrito'**
  String addedToCart(String name);

  /// No description provided for @errorSendingOrder.
  ///
  /// In es, this message translates to:
  /// **'Error al enviar pedido'**
  String get errorSendingOrder;

  /// No description provided for @scanValidQr.
  ///
  /// In es, this message translates to:
  /// **'Escanea un QR valido para acceder al menu.'**
  String get scanValidQr;

  /// No description provided for @tableNotAvailable.
  ///
  /// In es, this message translates to:
  /// **'Mesa no disponible. Consulta al personal.'**
  String get tableNotAvailable;

  /// No description provided for @invalidQr.
  ///
  /// In es, this message translates to:
  /// **'QR invalido para esta sucursal.'**
  String get invalidQr;

  /// No description provided for @branchNotFound.
  ///
  /// In es, this message translates to:
  /// **'Sucursal no encontrada.'**
  String get branchNotFound;

  /// No description provided for @unexpectedError.
  ///
  /// In es, this message translates to:
  /// **'Error inesperado. Intenta de nuevo.'**
  String get unexpectedError;

  /// No description provided for @mainHall.
  ///
  /// In es, this message translates to:
  /// **'Salon principal'**
  String get mainHall;

  /// No description provided for @orderCreated.
  ///
  /// In es, this message translates to:
  /// **'Pedido realizado: {time}'**
  String orderCreated(String time);

  /// No description provided for @confirmed.
  ///
  /// In es, this message translates to:
  /// **'Confirmado'**
  String get confirmed;

  /// No description provided for @products.
  ///
  /// In es, this message translates to:
  /// **'Productos'**
  String get products;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
