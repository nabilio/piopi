-- Fonction pour incrémenter le compteur d'utilisation des codes promo

CREATE OR REPLACE FUNCTION increment_promo_usage(promo_code_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE code = UPPER(promo_code_input)
    AND active = true
    AND (max_uses IS NULL OR current_uses < max_uses);
END;
$$;
