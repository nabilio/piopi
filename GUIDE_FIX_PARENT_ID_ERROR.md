# 🔧 Guide de résolution de l'erreur "parent_id does not exist"

## ❌ Erreur rencontrée

```
Failed to create child profile: column "parent_id" does not exist
```

## 📋 Cause du problème

La colonne `parent_id` n'existe pas dans la table `profiles` de votre base de données. Cette colonne est essentielle pour créer la relation parent-enfant.

---

## ✅ Solution en 2 étapes

### Étape 1 : Vérifier la structure de votre table profiles

1. Allez sur votre **Supabase Dashboard** → **Table Editor**
2. Sélectionnez la table `profiles`
3. Vérifiez si la colonne `parent_id` existe dans la liste des colonnes

### Étape 2 : Appliquer le correctif SQL

1. Allez sur **SQL Editor** dans Supabase
2. Créez une **New Query**
3. Copiez-collez le contenu du fichier `FIX_PARENT_ID_COLUMN.sql`
4. Cliquez sur **Run**

Le script va :
- ✅ Vérifier si la colonne `parent_id` existe
- ✅ La créer si elle n'existe pas
- ✅ Créer un index pour optimiser les performances
- ✅ Afficher un message de confirmation

---

## 🔍 Vérification après correction

1. **Rechargez votre application**
2. **Tentez à nouveau d'ajouter un enfant**
3. Le processus devrait fonctionner sans erreur

---

## 📝 Structure attendue de la table profiles

Voici les colonnes importantes pour le système parent-enfant :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | ID unique du profil |
| `email` | text | Email de l'utilisateur |
| `full_name` | text | Nom complet |
| `role` | text | Rôle : 'parent', 'child', ou 'admin' |
| `parent_id` | uuid | ID du parent (null pour les parents, rempli pour les enfants) |
| `age` | integer | Âge (pour les enfants) |
| `grade_level` | text | Niveau scolaire (pour les enfants) |

---

## 🆘 Si le problème persiste

Si après avoir appliqué le correctif le problème persiste :

1. **Vérifiez les logs de la fonction edge** :
   - Dashboard Supabase → Functions → `create-child-profile`
   - Consultez les logs pour voir le message d'erreur exact

2. **Vérifiez les permissions RLS** :
   - La table `profiles` doit avoir des policies qui permettent l'insertion
   - Vérifiez que la policy d'insertion pour les enfants existe

3. **Testez manuellement** :
   ```sql
   -- Test d'insertion dans SQL Editor
   INSERT INTO profiles (
     id,
     email,
     full_name,
     role,
     parent_id,
     age,
     grade_level,
     onboarding_completed
   ) VALUES (
     gen_random_uuid(),
     'test@child.local',
     'Test Enfant',
     'child',
     auth.uid(), -- Votre ID parent
     8,
     'CE2',
     true
   );
   ```

Si cette requête échoue, l'erreur exacte vous indiquera le problème.

---

## 📞 Besoin d'aide ?

Si vous continuez à rencontrer des problèmes, fournissez :
1. Le message d'erreur complet
2. La structure de votre table `profiles` (colonnes)
3. Les logs de la fonction edge `create-child-profile`
