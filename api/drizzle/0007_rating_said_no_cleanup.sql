-- "Yemedim/yemem" dedikten sonra puanı silinmeyen kayıtlar (eski hata): puan geri çekilir.
DELETE FROM "rating" r
USING "swipe" s, "menu_item" mi, "menu" m
WHERE s."user_id" = r."user_id"
  AND s."choice" = 'no'
  AND mi."id" = s."menu_item_id"
  AND m."id" = mi."menu_id"
  AND mi."dish_id" = r."dish_id"
  AND m."date" = r."date";
