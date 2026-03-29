import 'package:cloud_firestore/cloud_firestore.dart';

sealed class AppException implements Exception {
  const AppException(this.message, {this.code});
  final String message;
  final String? code;

  factory AppException.fromFirebase(FirebaseException e) => switch (e.code) {
        'permission-denied' => const PermissionDeniedException(),
        'not-found' => const NotFoundException(),
        'unavailable' => const NetworkException(),
        'already-exists' => const AlreadyExistsException(),
        _ => UnknownException(e.message ?? 'Error desconocido'),
      };

  @override
  String toString() => 'AppException($code): $message';
}

final class PermissionDeniedException extends AppException {
  const PermissionDeniedException()
      : super('Sin permisos para esta operación', code: 'permission-denied');
}

final class NotFoundException extends AppException {
  const NotFoundException() : super('Recurso no encontrado', code: 'not-found');
}

final class NetworkException extends AppException {
  const NetworkException() : super('Sin conexión', code: 'unavailable');
}

final class AlreadyExistsException extends AppException {
  const AlreadyExistsException() : super('Ya existe', code: 'already-exists');
}

final class UnknownException extends AppException {
  const UnknownException(super.message);
}
