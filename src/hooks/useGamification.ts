import { useState, useEffect } from 'react';
import { supabase, Achievement } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useGamification() {
  const { user, profile } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user && profile) {
      loadGamificationData();
    }
  }, [user, profile, refreshKey]);

  async function loadGamificationData() {
    if (!user || !profile) return;

    const { data: progressData } = await supabase
      .from('progress')
      .select('score')
      .eq('child_id', profile.id)
      .eq('completed', true);

    const points = progressData?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
    setTotalPoints(points);

    const { data: achievementsData } = await supabase
      .from('achievements')
      .select('*')
      .eq('child_id', profile.id)
      .order('unlocked_at', { ascending: false});

    setAchievements(achievementsData || []);
  }

  function refreshGamificationData() {
    setRefreshKey(prev => prev + 1);
  }

  async function checkAndUnlockAchievements() {
    if (!user) return;

    const { data: progressData } = await supabase
      .from('progress')
      .select('*')
      .eq('child_id', user.id);

    if (!progressData) return;

    const completed = progressData.filter((p) => p.completed);
    const points = completed.reduce((sum, p) => sum + (p.score || 0), 0);

    const achievementChecks = [
      {
        id: 'first_activity',
        condition: completed.length >= 1,
        title: 'Premier pas',
        description: 'Tu as complété ta première activité !',
        icon: '🎯',
      },
      {
        id: 'five_activities',
        condition: completed.length >= 5,
        title: 'En route !',
        description: 'Tu as complété 5 activités !',
        icon: '🚀',
      },
      {
        id: 'ten_activities',
        condition: completed.length >= 10,
        title: 'Champion',
        description: 'Tu as complété 10 activités !',
        icon: '🏆',
      },
      {
        id: 'hundred_points',
        condition: points >= 100,
        title: 'Collectionneur',
        description: 'Tu as gagné 100 points !',
        icon: '💎',
      },
      {
        id: 'five_hundred_points',
        condition: points >= 500,
        title: 'Super star',
        description: 'Tu as gagné 500 points !',
        icon: '⭐',
      },
    ];

    for (const check of achievementChecks) {
      if (check.condition) {
        const existing = achievements.find((a) => a.title === check.title);
        if (!existing) {
          const { data, error } = await supabase
            .from('achievements')
            .insert({
              child_id: user.id,
              title: check.title,
              description: check.description,
              icon: check.icon,
            })
            .select()
            .single();

          if (!error && data) {
            setNewAchievement(data);
            setAchievements((prev) => [data, ...prev]);

            // Post achievement unlock to activity feed
            await supabase.from('activity_feed').insert({
              user_id: user.id,
              activity_type: 'achievement_unlocked',
              content: {
                title: data.title,
                description: data.description,
                icon: data.icon
              },
              points_earned: 50
            });
          }
        }
      }
    }
  }

  async function recordProgress(activityId: string, score: number, timeSpent: number) {
    if (!user) return;

    const { error } = await supabase.from('progress').insert({
      child_id: user.id,
      activity_id: activityId,
      completed: true,
      score,
      time_spent: timeSpent,
    });

    if (!error) {
      setTotalPoints((prev) => prev + score);
      await checkAndUnlockAchievements();
    }
  }

  function clearNewAchievement() {
    setNewAchievement(null);
  }

  return {
    totalPoints,
    achievements,
    newAchievement,
    recordProgress,
    clearNewAchievement,
    refreshGamificationData,
  };
}
