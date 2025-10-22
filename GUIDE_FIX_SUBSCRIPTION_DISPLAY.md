# Guide de correction - Affichage incorrect de l'abonnement

## Problème identifié

Après un upgrade d'abonnement de Famille (Trio) vers Premium (Quatro), l'interface affiche :
- ❌ Plan actuel : "Famille"
- ❌ Enfants : "4 / 3"
- ❌ Tarif : "5€" (au lieu de 6€)

Au lieu de :
- ✅ Plan actuel : "Premium"
- ✅ Enfants : "4 / 4"
- ✅ Tarif : "6€"

## Cause du problème

Le champ `plan_type` dans la table `subscriptions` n'a pas été mis à jour correctement lors de l'upgrade. Il reste à `'family'` au lieu de passer à `'premium'`.

## Solution

### Option 1 : Migration SQL (Recommandée)

Appliquez la migration de correction `FIX_SUBSCRIPTION_PLAN_TYPE.sql` dans votre base de données Supabase.

Cette migration va :
1. Identifier tous les abonnements où `children_count` ne correspond pas à `plan_type`
2. Mettre à jour automatiquement `plan_type` pour correspondre au bon plan

### Option 2 : Correction manuelle via Supabase Dashboard

1. Allez dans Supabase Dashboard → Table Editor
2. Ouvrez la table `subscriptions`
3. Trouvez l'abonnement concerné (celui avec `children_count = 4` et `plan_type = 'family'`)
4. Modifiez `plan_type` de `'family'` à `'premium'`
5. Sauvegardez les modifications

### Option 3 : Attendre le prochain changement d'onglet

Le code a été mis à jour pour forcer le rechargement des données d'abonnement à chaque changement d'onglet dans les paramètres. L'utilisateur peut :
1. Quitter l'onglet "Abonnement"
2. Revenir sur l'onglet "Abonnement"
3. Les données seront rechargées depuis la base de données

**Note** : Cette option ne fonctionne que si la base de données a été corrigée (Options 1 ou 2).

## Vérification

Après avoir appliqué la correction :

1. Allez dans Settings → Abonnement
2. Vérifiez que l'affichage montre :
   - Plan actuel : **Premium**
   - Enfants : **4 / 4**
   - Tarif mensuel : **6€**
   - Prix par enfant : **1.50€**

## Prévention

Les modifications suivantes ont été apportées au code pour éviter ce problème à l'avenir :

1. **Rechargement automatique** : Le composant `SubscriptionManager` se recharge maintenant automatiquement quand on revient sur l'onglet "Abonnement"

2. **Vérification du plan** : Le code de `UpgradePlansPage` met déjà à jour correctement `plan_type` (lignes 157-163)

3. **Cache management** : Utilisation d'une `key` React pour forcer le remontage du composant et éviter les données en cache

## Support technique

Si le problème persiste après avoir appliqué la migration :

1. Vérifiez dans la console du navigateur s'il y a des erreurs
2. Vérifiez que la valeur de `plan_type` dans la base de données est bien `'premium'`
3. Effacez le cache du navigateur (Ctrl+Shift+R)
4. Déconnectez-vous et reconnectez-vous
