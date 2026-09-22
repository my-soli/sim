import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/site.dart';
import '../../core/session.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.next});
  final String? next;
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _id = TextEditingController();
  final _code = TextEditingController();
  bool _codeSent = false, _busy = false;
  String? _error, _devCode;

  Future<void> _run(Future<void> Function() job) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await job();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send() => _run(() async {
        final dev = await api.requestOtp(_id.text.trim());
        setState(() {
          _codeSent = true;
          _devCode = dev;
          if (dev != null) _code.text = dev;
        });
      });

  Future<void> _verify() => _run(() async {
        final token = await api.verifyOtp(_id.text.trim(), _code.text.trim());
        await session.signIn(token);
        if (mounted) context.go(widget.next ?? '/');
      });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SubPage(
      crumbs: const [Crumb('Home', '/'), Crumb('Sign in')],
      max: 480,
      child: ListView(padding: const EdgeInsets.symmetric(vertical: 32), children: [
        Text('Welcome', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Text(_codeSent ? 'Enter the 6-digit code we sent to ${_id.text.trim()}.' : 'Sign in with your email or phone number. We\'ll send you a one-time code.'),
        const SizedBox(height: 24),
        TextField(
          controller: _id,
          enabled: !_codeSent && !_busy,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email or phone (+254…)', border: OutlineInputBorder()),
          onSubmitted: (_) => _codeSent ? null : _send(),
        ),
        if (_codeSent) ...[
          const SizedBox(height: 16),
          TextField(
            controller: _code,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(labelText: 'Code', border: OutlineInputBorder()),
            onSubmitted: (_) => _verify(),
          ),
          if (_devCode != null)
            Text('Dev mode: code prefilled ($_devCode)', style: theme.textTheme.bodySmall),
        ],
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        ],
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _busy ? null : (_codeSent ? _verify : _send),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: _busy
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(_codeSent ? 'Verify and continue' : 'Send code'),
          ),
        ),
        if (_codeSent)
          TextButton(
            onPressed: _busy ? null : () => setState(() => _codeSent = false),
            child: const Text('Use a different email or phone'),
          ),
      ]),
    );
  }
}
