abstract class FirestorePaths {
  static const organizations = 'organizations';
  static const branches = 'branches';
  static const menus = 'menus';
  static const categories = 'categories';
  static const products = 'products';
  static const tables = 'tables';
  static const stations = 'stations';
  static const orders = 'orders';
  static const orderItems = 'order_items';
  static const users = 'users';
  static const integrations = 'integrations';

  // Documentos individuales
  static String org(String orgId) => '$organizations/$orgId';
  static String branch(String orgId, String branchId) => '$branches/$branchId';
  static String order(String orderId) => '$orders/$orderId';
  static String orderItem(String itemId) => '$orderItems/$itemId';
  static String product(String productId) => '$products/$productId';
  static String table(String tableId) => '$tables/$tableId';
  static String station(String stationId) => '$stations/$stationId';
  static String user(String userId) => '$users/$userId';
}
