import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_colors.dart';
import 'session_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _username = TextEditingController(text: 'admin');
  final _pass     = TextEditingController(text: 'admin');
  final _formKey = GlobalKey<FormState>();
  bool _busy = false;
  bool _triedRestore = false;

  @override
  void initState() {
    super.initState();
    // Attempt to restore existing Firebase Auth session so a returning
    // user goes straight to the home screen without re-typing.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(sessionControllerProvider).restoreIfPossible();
      if (mounted) setState(() => _triedRestore = true);
    });
  }

  @override
  void dispose() {
    _username.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(sessionControllerProvider).signIn(_username.text, _pass.text);
    } catch (_) {
      // error message is already populated in sessionErrorProvider
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final error = ref.watch(sessionErrorProvider);

    if (!_triedRestore) {
      return const Scaffold(
        backgroundColor: WaiterColors.kSurface,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: WaiterColors.kSurface,
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
            children: [
              const SizedBox(height: 24),
              Text(
                'Waiter',
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                'RestaurantOS',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              _sectionLabel('Usuario'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _username,
                autofillHints: const [AutofillHints.username],
                keyboardType: TextInputType.text,
                autocorrect: false,
                textInputAction: TextInputAction.next,
                decoration: _inputDecoration('usuario de Odoo'),
                validator: (v) =>
                    (v == null || v.isEmpty) ? 'Campo requerido' : null,
              ),
              const SizedBox(height: 16),
              _sectionLabel('Contraseña'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _pass,
                autofillHints: const [AutofillHints.password],
                obscureText: true,
                textInputAction: TextInputAction.done,
                decoration: _inputDecoration('Mínimo 6 caracteres'),
                validator: (v) =>
                    (v == null || v.length < 6) ? 'Muy corta' : null,
                onFieldSubmitted: (_) => _submit(),
              ),
              if (error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: WaiterColors.kError.withAlpha(60)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          color: WaiterColors.kError, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          error,
                          style: const TextStyle(
                            color: WaiterColors.kError,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                height: 52,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: WaiterColors.kBrand,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: _busy ? null : _submit,
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Entrar',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String s) => Text(
        s.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
          color: WaiterColors.kText3,
        ),
      );

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: WaiterColors.kBorder, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: WaiterColors.kBorder, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: WaiterColors.kBrand, width: 1.8),
        ),
      );
}
