import 'package:flutter/material.dart';

/// Singleton ChangeNotifier that drives GoRouter's refreshListenable.
/// Call setAuthenticated() after a successful login, setGuest() for guest
/// mode, and logout() when clearing the session.
class AuthNotifier extends ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isGuest = false;

  bool get isAuthenticated => _isAuthenticated;
  bool get isGuest => _isGuest;
  bool get hasSession => _isAuthenticated || _isGuest;

  void setAuthenticated() {
    _isAuthenticated = true;
    _isGuest = false;
    notifyListeners();
  }

  void setGuest() {
    _isAuthenticated = false;
    _isGuest = true;
    notifyListeners();
  }

  void logout() {
    _isAuthenticated = false;
    _isGuest = false;
    notifyListeners();
  }
}

final authNotifier = AuthNotifier();
