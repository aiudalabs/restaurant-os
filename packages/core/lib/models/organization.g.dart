// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organization.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$OrganizationImpl _$$OrganizationImplFromJson(Map<String, dynamic> json) =>
    _$OrganizationImpl(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      logoUrl: json['logoUrl'] as String?,
      plan: json['plan'] as String? ?? 'free',
      planExpiresAt: json['planExpiresAt'] == null
          ? null
          : DateTime.parse(json['planExpiresAt'] as String),
      defaultCurrency: json['defaultCurrency'] as String? ?? 'USD',
      defaultTaxPercent:
          (json['defaultTaxPercent'] as num?)?.toDouble() ?? 0.07,
      defaultTipOptions: (json['defaultTipOptions'] as List<dynamic>?)
              ?.map((e) => (e as num).toDouble())
              .toList() ??
          const [10, 15, 20],
      timezone: json['timezone'] as String? ?? 'America/Panama',
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      ownerId: json['ownerId'] as String? ?? '',
    );

Map<String, dynamic> _$$OrganizationImplToJson(_$OrganizationImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'slug': instance.slug,
      'logoUrl': instance.logoUrl,
      'plan': instance.plan,
      'planExpiresAt': instance.planExpiresAt?.toIso8601String(),
      'defaultCurrency': instance.defaultCurrency,
      'defaultTaxPercent': instance.defaultTaxPercent,
      'defaultTipOptions': instance.defaultTipOptions,
      'timezone': instance.timezone,
      'isActive': instance.isActive,
      'createdAt': instance.createdAt.toIso8601String(),
      'ownerId': instance.ownerId,
    };
