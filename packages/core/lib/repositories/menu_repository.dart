import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/menu.dart';
import '../models/category.dart';
import '../models/product.dart';
import '../utils/firestore_paths.dart';
import '../utils/app_exceptions.dart';

class MenuRepository {
  MenuRepository(this._db);
  final FirebaseFirestore _db;

  CollectionReference<Menu> get _menuCol => _db
      .collection(FirestorePaths.menus)
      .withConverter(
        fromFirestore: (doc, _) => Menu.fromFirestore(doc),
        toFirestore: (menu, _) => menu.toFirestore(),
      );

  CollectionReference<Category> get _catCol => _db
      .collection(FirestorePaths.categories)
      .withConverter(
        fromFirestore: (doc, _) => Category.fromFirestore(doc),
        toFirestore: (cat, _) => cat.toFirestore(),
      );

  CollectionReference<Product> get _prodCol => _db
      .collection(FirestorePaths.products)
      .withConverter(
        fromFirestore: (doc, _) => Product.fromFirestore(doc),
        toFirestore: (prod, _) => prod.toFirestore(),
      );

  // Menus
  Stream<List<Menu>> watchMenus({required String orgId}) {
    try {
      return _menuCol
          .where('orgId', isEqualTo: orgId)
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  // Categories por menú
  Stream<List<Category>> watchCategories({required String menuId}) {
    try {
      return _catCol
          .where('menuId', isEqualTo: menuId)
          .where('isActive', isEqualTo: true)
          .orderBy('sortOrder')
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  // Products por categoría
  Stream<List<Product>> watchProducts({required String categoryId}) {
    try {
      return _prodCol
          .where('categoryId', isEqualTo: categoryId)
          .where('isActive', isEqualTo: true)
          .orderBy('sortOrder')
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  // Products por menú completo
  Stream<List<Product>> watchProductsByMenu({required String menuId}) {
    try {
      return _prodCol
          .where('menuId', isEqualTo: menuId)
          .where('isActive', isEqualTo: true)
          .orderBy('sortOrder')
          .snapshots()
          .map((s) => s.docs.map((d) => d.data()).toList());
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }

  Future<Product?> getProduct(String productId) async {
    try {
      final doc = await _prodCol.doc(productId).get();
      return doc.data();
    } on FirebaseException catch (e) {
      throw AppException.fromFirebase(e);
    }
  }
}
