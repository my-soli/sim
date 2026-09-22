import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Override at build/run time: --dart-define=API_BASE=http://192.168.1.20:3100
const _apiBaseOverride = String.fromEnvironment('API_BASE');

String get apiBase {
  if (_apiBaseOverride.isNotEmpty) return _apiBaseOverride;
  // Android emulator reaches the host machine via 10.0.2.2. A physical phone needs API_BASE.
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:3100';
  }
  return 'http://localhost:3100';
}

class ApiException implements Exception {
  ApiException(this.message, [this.status]);
  final String message;
  final int? status;
  @override
  String toString() => message;
}

class Country {
  Country.fromJson(Map<String, dynamic> j)
      : code = j['code'],
        name = j['name'],
        isRegional = j['isRegional'],
        popular = j['popular'],
        fromPriceCents = j['fromPriceCents'],
        planCount = j['planCount'];
  final String code, name;
  final bool isRegional, popular;
  final int fromPriceCents, planCount;
}

class Plan {
  Plan.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        name = j['name'],
        country = j['country'],
        countryName = j['countryName'],
        dataBytes = j['dataBytes'],
        validityDays = j['validityDays'],
        priceCents = j['priceCents'],
        smsStatus = j['smsStatus'] ?? 0,
        activeType = j['activeType'] ?? 1;
  final String id, name, country, countryName;
  final int dataBytes, validityDays, priceCents;

  /// 0 = no SMS, 1 = can receive SMS (from phones and API), 2 = only SMS sent by us (not useful to customers).
  final int smsStatus;
  bool get receivesSms => smsStatus == 1;

  /// 1 = validity counts down from install, 2 = from first network connection abroad.
  final int activeType;
  bool get countsDownFromConnection => activeType == 2;
}

class EsimInfo {
  EsimInfo.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        orderId = j['orderId'],
        iccid = j['iccid'],
        smdpAddress = j['smdpAddress'],
        activationCode = j['activationCode'],
        lpaString = j['lpaString'],
        status = j['status'],
        dataUsedBytes = j['dataUsedBytes'],
        dataTotalBytes = j['dataTotalBytes'],
        expiresAt = j['expiresAt'] == null ? null : DateTime.parse(j['expiresAt']),
        country = j['country'],
        countryName = j['countryName'],
        planName = j['planName'],
        activeType = j['activeType'] ?? 1;
  final String id, orderId, status, country, countryName, planName;
  final String? iccid, smdpAddress, activationCode, lpaString;
  final int dataUsedBytes, dataTotalBytes;
  final DateTime? expiresAt;

  /// 1 = validity counts down from install, 2 = from first network connection abroad.
  final int activeType;
  bool get countsDownFromConnection => activeType == 2;

  bool get isExpired => status == 'EXPIRED' || status == 'CANCELLED';
  double get usedFraction =>
      dataTotalBytes == 0 ? 0 : (dataUsedBytes / dataTotalBytes).clamp(0.0, 1.0);
}

class OrderInfo {
  OrderInfo.fromJson(Map<String, dynamic> j)
      : id = j['id'],
        status = j['status'],
        priceCents = j['priceCents'],
        failureReason = j['failureReason'],
        plan = Plan.fromJson({...j['package'], 'priceCents': j['priceCents']}),
        esim = j['esim'] == null ? null : EsimInfo.fromJson(j['esim']);
  final String id, status;
  final int priceCents;
  final String? failureReason;
  final Plan plan;
  final EsimInfo? esim;
}

class ApiClient {
  String? token;

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    final uri = Uri.parse('$apiBase$path');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    http.Response res;
    try {
      res = await (method == 'GET'
              ? http.get(uri, headers: headers)
              : http.post(uri, headers: headers, body: jsonEncode(body ?? {})))
          .timeout(const Duration(seconds: 20));
    } catch (_) {
      throw ApiException('Can\'t reach the server. Check your connection.');
    }
    final decoded = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final msg = decoded is Map ? decoded['message'] : null;
      throw ApiException(
        msg is List ? msg.join(', ') : (msg?.toString() ?? 'Something went wrong'),
        res.statusCode,
      );
    }
    return decoded;
  }

  Future<String?> requestOtp(String identifier) async {
    final r = await _send('POST', '/auth/otp/request', {'identifier': identifier});
    return r['devCode'] as String?; // only present when the server runs with OTP_DEV_ECHO
  }

  Future<String> verifyOtp(String identifier, String code) async {
    final r = await _send('POST', '/auth/otp/verify', {'identifier': identifier, 'code': code});
    return r['token'] as String;
  }

  Future<List<Country>> countries() async =>
      [for (final c in await _send('GET', '/catalog/countries')) Country.fromJson(c)];

  Future<List<Plan>> plans(String code) async =>
      [for (final p in await _send('GET', '/catalog/countries/$code/packages')) Plan.fromJson(p)];

  Future<OrderInfo> createOrder(String planId) async =>
      OrderInfo.fromJson(await _send('POST', '/orders', {'packageId': planId}));

  Future<OrderInfo> order(String id) async => OrderInfo.fromJson(await _send('GET', '/orders/$id'));

  Future<List<EsimInfo>> esims() async =>
      [for (final e in await _send('GET', '/esims')) EsimInfo.fromJson(e)];

  /// Returns a Stripe Checkout URL, or null in mock mode (payment completes server-side).
  Future<String?> stripeCheckout(String orderId) async =>
      (await _send('POST', '/payments/stripe/checkout', {'orderId': orderId}))['url'] as String?;

  Future<int> mpesaStk(String orderId, String phone) async =>
      (await _send('POST', '/payments/mpesa/stk', {'orderId': orderId, 'phone': phone}))['amountKes'] as int;
}
