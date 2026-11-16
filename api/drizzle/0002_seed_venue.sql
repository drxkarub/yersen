-- Faz 1'in tek menü kaynağı: Trakya Üniversitesi Merkez Kampüsler yemekhanesi.
INSERT INTO "venue" ("slug", "name", "kind", "city", "university")
VALUES ('trakya-merkez', 'Trakya Üniversitesi Merkez Kampüsler Yemekhanesi', 'cafeteria', 'Edirne', 'trakya')
ON CONFLICT ("slug") DO NOTHING;
