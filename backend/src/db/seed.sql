-- NatCA CMS — Seed Data

-- Roles
INSERT INTO roles (role_key, name) VALUES
  ('SYSTEM_ADMIN',   'System Administrator'),
  ('NATCA_ADMIN',    'NatCA Administrator'),
  ('NATCA_ANALYST',  'NatCA Analyst'),
  ('INSPECTOR',      'Field Inspector'),
  ('OPERATOR_ADMIN', 'Operator Administrator'),
  ('CITIZEN',        'Citizen')
ON CONFLICT (role_key) DO NOTHING;

-- Operators
INSERT INTO operators (operator_name, code, hotline) VALUES
  ('Orange Sierra Leone', 'ORANGE',   '222'),
  ('Africell',            'AFRICELL', '777'),
  ('Qcell',               'QCELL',    '555'),
  ('Sierra Tel',          'SIERATEL', '016')
ON CONFLICT (code) DO NOTHING;

-- Sierra Leone Districts
INSERT INTO districts (name, province) VALUES
  ('Freetown',            'Western Area'),
  ('Western Rural',       'Western Area'),
  ('Bo',                  'Southern Province'),
  ('Bonthe',              'Southern Province'),
  ('Moyamba',             'Southern Province'),
  ('Pujehun',             'Southern Province'),
  ('Kenema',              'Eastern Province'),
  ('Kailahun',            'Eastern Province'),
  ('Kono',                'Eastern Province'),
  ('Bombali',             'Northern Province'),
  ('Kambia',              'Northern Province'),
  ('Koinadugu',           'Northern Province'),
  ('Port Loko',           'Northern Province'),
  ('Tonkolili',           'Northern Province'),
  ('Falaba',              'North West Province'),
  ('Karene',              'North West Province')
ON CONFLICT (name) DO NOTHING;

-- Complaint categories
INSERT INTO complaint_categories (name, code, sla_hours, is_financial) VALUES
  ('No Network Coverage',         'NO_COVERAGE',     48,  FALSE),
  ('Call Drop',                   'CALL_DROP',        48,  FALSE),
  ('Poor Voice Quality',          'POOR_VOICE',       48,  FALSE),
  ('Slow Internet / Data',        'SLOW_DATA',        72,  FALSE),
  ('No Internet / Data',          'NO_DATA',          48,  FALSE),
  ('SMS Failure',                 'SMS_FAILURE',      48,  FALSE),
  ('Billing Dispute',             'BILLING_DISPUTE',  24,  TRUE),
  ('Mobile Money Dispute',        'MOMO_DISPUTE',     24,  TRUE),
  ('SIM / Account Issue',         'SIM_ISSUE',        72,  FALSE),
  ('Unsolicited Messages',        'SPAM',             72,  FALSE),
  ('Customer Service Complaint',  'CUSTOMER_SVC',     96,  FALSE),
  ('Other',                       'OTHER',            96,  FALSE)
ON CONFLICT (code) DO NOTHING;

-- USSD Codes
INSERT INTO ussd_codes (operator_id, service_category, code, description) VALUES
  (1, 'BALANCE',  '*222#',  'Orange — check airtime balance'),
  (1, 'DATA',     '*111#',  'Orange — buy data bundle'),
  (1, 'MOMO',     '*144#',  'Orange Money'),
  (2, 'BALANCE',  '*120#',  'Africell — check balance'),
  (2, 'DATA',     '*133#',  'Africell — buy data'),
  (2, 'MOMO',     '*161#',  'Afrimoney'),
  (3, 'BALANCE',  '*100#',  'Qcell — check balance'),
  (3, 'DATA',     '*303#',  'Qcell — buy data'),
  (3, 'MOMO',     '*444#',  'Qmoney')
ON CONFLICT DO NOTHING;
