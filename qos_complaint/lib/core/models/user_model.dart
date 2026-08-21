enum UserRole { consumer, regulatorAdmin, operatorAdmin }

class UserModel {
  final String name;
  final String phone;
  final String email;
  final String district;
  final String preferredOperator;
  final bool isGuest;
  final UserRole role;
  final String? assignedOperator;

  const UserModel({
    required this.name,
    required this.phone,
    this.email = '',
    this.district = 'Western Area Urban',
    this.preferredOperator = 'Africell',
    this.isGuest = false,
    this.role = UserRole.consumer,
    this.assignedOperator,
  });

  factory UserModel.guest() => const UserModel(
        name: 'Guest',
        phone: '',
        isGuest: true,
        role: UserRole.consumer,
      );

  factory UserModel.admin({String name = 'NatCA Officer', String email = 'admin@natca.gov.sl'}) => UserModel(
        name: name,
        phone: '+232 76 000 000',
        email: email,
        isGuest: false,
        role: UserRole.regulatorAdmin,
      );

  bool get isAdmin => role == UserRole.regulatorAdmin || role == UserRole.operatorAdmin;

  String get firstName {
    final parts = name.trim().split(' ');
    return parts.isNotEmpty ? parts.first : name;
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'email': email,
        'district': district,
        'preferredOperator': preferredOperator,
        'isGuest': isGuest,
        'role': role.name,
        'assignedOperator': assignedOperator,
      };

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        name: json['name'] as String? ?? 'User',
        phone: json['phone'] as String? ?? '',
        email: json['email'] as String? ?? '',
        district: json['district'] as String? ?? 'Western Area Urban',
        preferredOperator: json['preferredOperator'] as String? ?? 'Africell',
        isGuest: json['isGuest'] as bool? ?? false,
        role: UserRole.values.firstWhere(
          (r) => r.name == (json['role'] as String? ?? 'consumer'),
          orElse: () => UserRole.consumer,
        ),
        assignedOperator: json['assignedOperator'] as String?,
      );
}

