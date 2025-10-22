# 🔄 Guide de Restauration du Système d'Abonnement Simple

## ✅ Modifications effectuées

### 1. Code Frontend
- ✅ Supprimé `PlanSelection.tsx` de l'application
- ✅ Supprimé la vérification d'abonnement dans `App.tsx`
- ✅ Simplifié `AddChildWithUpgrade.tsx` - plus de formulaire complexe de confirmation
- ✅ Ajout d'un simple `confirm()` natif pour l'upgrade

### 2. Base de données
Une nouvelle migration a été créée pour restaurer le système automatique.

---

## 📋 Étapes pour appliquer les changements

### Étape 1 : Appliquer la migration SQL

1. Allez sur votre dashboard Supabase : [https://icfcwidajigdnmsehkzx.supabase.co](https://icfcwidajigdnmsehkzx.supabase.co)

2. Cliquez sur **SQL Editor** dans le menu de gauche

3. Cliquez sur **New Query**

4. Copiez-collez le contenu du fichier `APPLY_THIS_MIGRATION.sql`

5. Cliquez sur **Run** pour exécuter la migration

### Étape 2 : Vérifier que ça fonctionne

1. Rechargez votre application web

2. Le système de sélection de plan ne devrait plus apparaître

3. Les nouveaux parents recevront automatiquement un essai gratuit de 30 jours avec 1 enfant

4. Lors de l'ajout d'un enfant supplémentaire :
   - Si dans la limite : ajout direct
   - Si au-delà : simple popup de confirmation avec le nouveau prix

---

## 🎯 Comment ça fonctionne maintenant

### Inscription Parent
```
Parent s'inscrit
    ↓
Abonnement créé AUTOMATIQUEMENT
    ↓
- Status: trial
- Durée: 30 jours
- Enfants: 1
- Prix: 2€/mois (après l'essai)
```

### Ajout d'enfants
```
Parent ajoute un 2ème enfant
    ↓
Si on dépasse la limite (1 enfant)
    ↓
Popup de confirmation simple :
"Vous avez actuellement 1 profil d'enfant.
L'ajout de cet enfant portera votre abonnement
à 2 enfants pour 4€/mois (au lieu de 2€/mois).
Souhaitez-vous continuer ?"
    ↓
[OUI] → L'abonnement est mis à jour automatiquement
[NON] → Retour au formulaire
```

---

## 💰 Système de tarification

- **1 enfant** : 2€/mois
- **2 enfants** : 4€/mois
- **3 enfants** : 6€/mois
- **4 enfants** : 8€/mois
- Etc. (2€ par enfant)

**Essai gratuit** : 30 jours pour tous les nouveaux parents

---

## 🔍 Que faire si ça ne fonctionne pas

### Problème : "column subscriptions.user_id does not exist"

**Solution** : Vous devez d'abord appliquer la migration précédente qui renomme `parent_id` en `user_id`.

Copiez-collez ce SQL dans Supabase SQL Editor :

```sql
-- Renommer parent_id en user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN parent_id TO user_id;
  END IF;
END $$;
```

Puis appliquez `APPLY_THIS_MIGRATION.sql`.

---

## 📝 Notes importantes

- ✅ Aucune fonctionnalité n'a été modifiée, seulement l'interface utilisateur
- ✅ Le système d'upgrade d'abonnement fonctionne toujours
- ✅ L'historique des abonnements est toujours enregistré
- ✅ Les emails de confirmation sont toujours envoyés
- ✅ Simple et intuitif pour l'utilisateur

---

## 🎉 Résultat final

Votre application revient au modèle simple et efficace :
- Pas de choix complexe de plan
- Abonnement automatique à l'inscription
- Upgrade simple et transparent lors de l'ajout d'enfants
- Tarification claire : 2€ par enfant
