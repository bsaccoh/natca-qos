import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/services/api_client.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  void _showChangePasswordDialog(BuildContext context) {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();
    bool loading = false;
    bool obscure = true;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: AppColors.dynamicCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text("Change Password", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: currentController,
                  obscureText: obscure,
                  style: TextStyle(color: AppColors.dynamicTextPrimary),
                  decoration: InputDecoration(
                    labelText: 'Current Password',
                    filled: true,
                    fillColor: AppColors.dynamicBackground,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    suffixIcon: IconButton(
                      icon: Icon(obscure ? Icons.visibility_off : Icons.visibility, color: AppColors.textLight, size: 20),
                      onPressed: () => setDialogState(() => obscure = !obscure),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: newController,
                  obscureText: obscure,
                  style: TextStyle(color: AppColors.dynamicTextPrimary),
                  decoration: InputDecoration(
                    labelText: 'New Password',
                    hintText: 'At least 8 characters',
                    filled: true,
                    fillColor: AppColors.dynamicBackground,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: confirmController,
                  obscureText: obscure,
                  style: TextStyle(color: AppColors.dynamicTextPrimary),
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password',
                    filled: true,
                    fillColor: AppColors.dynamicBackground,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: loading ? null : () => Navigator.of(ctx).pop(),
              child: const Text("Cancel", style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: loading
                  ? null
                  : () async {
                      if (currentController.text.isEmpty || newController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Fill in all fields')),
                        );
                        return;
                      }
                      if (newController.text.length < 8) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('New password must be at least 8 characters')),
                        );
                        return;
                      }
                      if (newController.text != confirmController.text) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Passwords do not match')),
                        );
                        return;
                      }

                      setDialogState(() => loading = true);
                      try {
                        final res = await apiClient.patch('/auth/password', {
                          'currentPassword': currentController.text,
                          'newPassword': newController.text,
                        });
                        if (ctx.mounted) {
                          if (res.statusCode == 200) {
                            Navigator.of(ctx).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Password changed successfully')),
                            );
                          } else {
                            final body = json.decode(res.body);
                            final msg = body['error'] as String? ?? body['message'] as String? ?? 'Failed to change password';
                            setDialogState(() => loading = false);
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
                          }
                        }
                      } catch (_) {
                        if (ctx.mounted) {
                          setDialogState(() => loading = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Network error. Check your connection.')),
                          );
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryBlue,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: loading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text("Change", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _showLogoutConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.dynamicCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text("Log Out", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        content: const Text("Are you sure you want to log out?",
            style: TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Cancel", style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              ref.read(complaintsProvider.notifier).clear();
              await apiClient.clearTokens();
              authNotifier.logout();
              if (ctx.mounted) context.go('/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.errorRed,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text("Log Out", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);
    final user = ref.watch(userProvider);
    final displayName = user?.name ?? 'Guest';
    final displayEmail = user != null && user.email.isNotEmpty ? user.email : user?.phone ?? '';
    final displayLocation = user != null ? '${user.district}, Sierra Leone' : 'Sierra Leone';
    final initials = displayName.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Profile", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // User Avatar Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.primaryBlue.withOpacity(0.15),
                    child: initials.isNotEmpty
                        ? Text(initials, style: AppTextStyles.h3.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold))
                        : const Icon(Icons.person_outline_rounded, size: 36, color: AppColors.primaryBlue),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(displayName, style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
                        if (displayEmail.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(displayEmail, style: AppTextStyles.small),
                        ],
                        const SizedBox(height: 2),
                        Text(displayLocation, style: AppTextStyles.micro),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Settings options
            Container(
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: Column(
                children: [
                  // Dark Mode Switch
                  ListTile(
                    leading: const Icon(Icons.dark_mode_outlined, color: AppColors.primaryBlue),
                    title: Text("Dark Display Theme", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: Switch(
                      value: isDark,
                      activeColor: AppColors.primaryBlue,
                      onChanged: (val) {
                        ref.read(themeProvider.notifier).toggleTheme();
                      },
                    ),
                  ),
                  const Divider(height: 1, color: AppColors.border),
                  
                  // Language Selector
                  ListTile(
                    leading: const Icon(Icons.language_rounded, color: AppColors.accentGreen),
                    title: Text("Language", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text("English", style: AppTextStyles.small),
                        const Icon(Icons.chevron_right_rounded, color: AppColors.textLight),
                      ],
                    ),
                    onTap: () {},
                  ),
                  const Divider(height: 1, color: AppColors.border),

                  // Change Password
                  if (user != null && !user.isGuest) ...[
                    ListTile(
                      leading: const Icon(Icons.lock_outline_rounded, color: AppColors.errorRed),
                      title: Text("Change Password", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                      trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textLight),
                      onTap: () => _showChangePasswordDialog(context),
                    ),
                    const Divider(height: 1, color: AppColors.border),
                  ],

                  // Notifications preference
                  ListTile(
                    leading: const Icon(Icons.notifications_active_outlined, color: AppColors.warningOrange),
                    title: Text("Push Notifications", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textLight),
                    onTap: () {},
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Help section
            Container(
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.info_outline_rounded, color: AppColors.textSecondary),
                    title: Text("About NatCA QoE", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textLight),
                    onTap: () {},
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () => _showLogoutConfirmation(context, ref),
                icon: const Icon(Icons.logout_rounded, color: AppColors.errorRed),
                label: Text("Log Out", style: AppTextStyles.body.copyWith(
                  fontWeight: FontWeight.bold, color: AppColors.errorRed)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.errorRed),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // App version
            Text("NatCA QoE v1.0.0", style: AppTextStyles.micro.copyWith(color: AppColors.textLight)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
