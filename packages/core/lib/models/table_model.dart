import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'table_model.freezed.dart';
part 'table_model.g.dart';

@freezed
class TableModel with _$TableModel {
  const factory TableModel({
    required String id,
    required String orgId,
    required String branchId,
    required String number,
    String? zone,
    required int capacity,
    required String qrData,
    required bool isActive,
    String? currentOrderId,
  }) = _TableModel;

  factory TableModel.fromJson(Map<String, dynamic> json) =>
      _$TableModelFromJson(json);

  factory TableModel.fromFirestore(
      DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return TableModel.fromJson({
      ...data,
      'id': doc.id,
    });
  }

  const TableModel._();

  Map<String, dynamic> toFirestore() => toJson()..remove('id');
}
