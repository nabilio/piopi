# Instructions pour activer les Cours Personnalisés

## 1. Appliquer la migration SQL

La migration pour créer les tables nécessaires se trouve ici :
`supabase/migrations/20251019000000_create_custom_lessons_system.sql`

**Option A - Via Supabase Dashboard :**
1. Allez sur https://supabase.com/dashboard/project/icfcwidajigdnmsehkzx/editor
2. Cliquez sur "SQL Editor"
3. Copiez-collez le contenu du fichier `supabase/migrations/20251019000000_create_custom_lessons_system.sql`
4. Cliquez sur "Run" pour exécuter la migration

**Option B - Via CLI (si installé) :**
```bash
supabase db push
```

## 2. Déployer l'Edge Function

L'edge function `generate-custom-lesson` doit être déployée sur Supabase.

**Via Supabase Dashboard :**
1. Allez sur https://supabase.com/dashboard/project/icfcwidajigdnmsehkzx/functions
2. Cliquez sur "Deploy new function"
3. Nom : `generate-custom-lesson`
4. Copiez le contenu de `supabase/functions/generate-custom-lesson/index.ts`
5. Déployez

**Via CLI (recommandé) :**
```bash
supabase functions deploy generate-custom-lesson
```

## 3. Configurer la clé API OpenAI

L'edge function a besoin d'une clé API OpenAI pour générer les leçons.

1. Allez sur https://supabase.com/dashboard/project/icfcwidajigdnmsehkzx/settings/functions
2. Dans la section "Secrets", ajoutez :
   - Nom : `OPENAI_API_KEY`
   - Valeur : Votre clé API OpenAI (commence par `sk-...`)

**Pour obtenir une clé OpenAI :**
1. Créez un compte sur https://platform.openai.com
2. Allez dans API Keys
3. Créez une nouvelle clé API
4. Copiez la clé et ajoutez-la dans Supabase

## 4. Vérifier que tout fonctionne

1. **Testez la base de données :**
   - Connectez-vous en tant que parent
   - Allez dans "Tableau de bord"
   - Cliquez sur "Cours perso" (bouton violet)
   - Vous devriez voir la liste de vos enfants

2. **Testez la génération :**
   - Sélectionnez un enfant
   - Cliquez sur "Créer une nouvelle leçon"
   - Remplissez le formulaire
   - Cliquez sur "Générer la leçon et le quiz"
   - Si la clé OpenAI est bien configurée, la leçon devrait se générer

3. **Testez côté enfant :**
   - Connectez-vous avec un profil enfant
   - Sur la page d'accueil, cliquez sur "Cours Personnalisés" (carte violette)
   - Vous devriez voir les leçons publiées par vos parents

## Fonctionnalités

### Côté Parent :
- ✅ Création de leçons personnalisées avec IA
- ✅ Limite de 3 générations par jour et par enfant
- ✅ Prévisualisation avant publication
- ✅ Gestion complète (publier/masquer/supprimer)
- ✅ Organisation par matière

### Côté Enfant :
- ✅ Accès aux leçons publiées
- ✅ Lecteur de leçon interactif
- ✅ Quiz de 6 questions (2 faciles, 2 moyennes, 2 difficiles)
- ✅ Résultats détaillés avec corrections
- ✅ Progression sauvegardée

## Dépannage

### Erreur 404 sur generate-custom-lesson
➡️ L'edge function n'est pas déployée. Suivez l'étape 2.

### Erreur 500 "Internal Server Error"
L'edge function est déployée mais rencontre une erreur. Vérifiez les logs dans Supabase :
1. Allez dans Functions → generate-custom-lesson → Logs
2. Regardez les messages d'erreur détaillés

Messages possibles :
- **"Configuration manquante : clé API OpenAI non configurée"**
  ➡️ La clé `OPENAI_API_KEY` n'est pas configurée dans Supabase. Suivez l'étape 3.

- **"Erreur OpenAI (401)"**
  ➡️ Votre clé API OpenAI est invalide. Vérifiez qu'elle commence par `sk-` et qu'elle est valide sur https://platform.openai.com

- **"Erreur OpenAI (429)"**
  ➡️ Vous avez dépassé votre quota OpenAI ou le rate limit. Vérifiez vos crédits sur https://platform.openai.com

- **"Format de réponse invalide de l'IA"**
  ➡️ L'IA n'a pas généré un JSON valide. Réessayez la génération.

- **"Le quiz généré ne contient pas exactement 6 questions"**
  ➡️ L'IA n'a pas généré 6 questions. Réessayez la génération.

### Erreur CORS
➡️ L'edge function est déployée mais les headers CORS ne sont pas configurés.
Vérifiez que le code de l'edge function contient bien les headers CORS au début du fichier.

### "Error loading lessons"
➡️ Les tables n'existent pas encore. Appliquez la migration SQL (étape 1).

### "Limite quotidienne atteinte" immédiatement
➡️ La date dans la base de données peut être incorrecte. Vérifiez votre timezone Supabase.

### La génération ne produit rien
➡️ Vérifiez que la clé API OpenAI est bien configurée et valide (étape 3).

## Notes importantes

- Les leçons générées utilisent GPT-4o-mini d'OpenAI
- Le système refuse de générer du contenu non-éducatif
- Les leçons ne sont visibles par l'enfant que si elles sont "publiées"
- La progression des enfants est enregistrée dans `custom_lesson_progress`
