import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Loader2, PartyPopper, MapPin, Clock, CheckCircle2, XCircle, Filter, Sparkles } from 'lucide-react';
import { Profile, BirthdayInvitation, supabase } from '../lib/supabase';
import {
  computeUpcomingBirthdays,
  fetchBirthdayInvitations,
  fetchParentChildrenWithBirthdays,
  respondToBirthdayInvitation,
  BirthdayResponseStatus,
  submitBirthdayUpdate,
} from '../lib/birthdayService';
import { ChildBirthdayModal } from './ChildBirthdayModal';

const FILTERS = [
  { value: 'pending', label: 'En attente' },
  { value: 'accepted', label: 'Confirmées' },
  { value: 'declined', label: 'Refusées' },
  { value: 'all', label: 'Toutes' },
] as const;

type InvitationFilter = typeof FILTERS[number]['value'];

type ParentBirthdaysProps = {
  onBack: () => void;
  parentId: string;
};

export function ParentBirthdays({ onBack, parentId }: ParentBirthdaysProps) {
  const [children, setChildren] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<BirthdayInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvitationFilter>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildForBirthday, setSelectedChildForBirthday] = useState<Profile | null>(null);
  const [birthdayModalError, setBirthdayModalError] = useState<string | null>(null);
  const [birthdayModalLoading, setBirthdayModalLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [parentId]);

  const upcomingBirthdays = useMemo(() => computeUpcomingBirthdays(children).slice(0, 5), [children]);
  const pendingInvitations = useMemo(() => invitations.filter((invitation) => invitation.status === 'pending'), [invitations]);

  const filteredInvitations = useMemo(() => {
    if (filter === 'all') {
      return invitations;
    }
    return invitations.filter((invitation) => invitation.status === filter);
  }, [filter, invitations]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const childProfiles = await fetchParentChildrenWithBirthdays(parentId);
      setChildren(childProfiles);

      if (childProfiles.length > 0) {
        const invites = await fetchBirthdayInvitations(childProfiles.map((child) => child.id));
        setInvitations(invites);
      } else {
        setInvitations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les anniversaires');
    } finally {
      setLoading(false);
    }
  }

  async function refreshInvitations() {
    setRefreshing(true);
    setActionMessage(null);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleInvitationResponse(invitationId: string, status: BirthdayResponseStatus) {
    setError(null);
    try {
      await respondToBirthdayInvitation(invitationId, status);
      setActionMessage(status === 'accepted' ? 'Invitation confirmée avec succès.' : 'Invitation refusée.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour l\'invitation');
    }
  }

  function openBirthdayModal(child: Profile) {
    setSelectedChildForBirthday(child);
    setBirthdayModalError(null);
    setBirthdayModalLoading(false);
  }

  function closeBirthdayModal() {
    setSelectedChildForBirthday(null);
    setBirthdayModalError(null);
    setBirthdayModalLoading(false);
  }

  async function handleBirthdaySubmit({ birthday }: { birthday: string; consent: boolean }) {
    if (!selectedChildForBirthday) {
      return;
    }

    setBirthdayModalLoading(true);
    setBirthdayModalError(null);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expirée, veuillez vous reconnecter.');
      }

      await submitBirthdayUpdate(session.access_token, {
        birthday,
        consent: true,
        childId: selectedChildForBirthday.id,
        sessionUserId: session.user?.id,
      });

      setActionMessage(`Anniversaire enregistré pour ${selectedChildForBirthday.full_name}.`);
      closeBirthdayModal();
      await loadData();
    } catch (err) {
      setBirthdayModalError(
        err instanceof Error
          ? err.message
          : 'Impossible d\'enregistrer la date d\'anniversaire',
      );
    } finally {
      setBirthdayModalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-purple-500" />
          Chargement des anniversaires...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow transition hover:bg-purple-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-purple-600 shadow">
            <CalendarDays className="h-4 w-4" />
            Suivi des anniversaires
          </div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                <PartyPopper className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-600">Enfants enregistrés</p>
                <p className="text-2xl font-bold text-gray-900">{children.length}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Ajoutez les dates d'anniversaire de vos enfants depuis cet espace pour préparer les surprises et gérer les invitations.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-pink-600">Invitations en attente</p>
                <p className="text-2xl font-bold text-gray-900">{pendingInvitations.length}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Confirmez ou refusez les invitations reçues pour organiser le planning familial.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600">Prochains anniversaires</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingBirthdays.length}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Anticipez les événements pour préparer les surprises et prévenir les invités.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {actionMessage}
          </div>
        )}

        <section className="mb-10 rounded-3xl bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <CalendarDays className="h-5 w-5 text-purple-500" />
              Prochains anniversaires
            </h2>
            <button
              type="button"
              onClick={refreshInvitations}
              className="flex items-center gap-2 rounded-2xl border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-600 transition hover:bg-purple-50 disabled:opacity-50"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualisation...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Rafraîchir
                </>
              )}
            </button>
          </div>

          {upcomingBirthdays.length === 0 ? (
            <p className="rounded-2xl bg-purple-50 p-6 text-sm text-purple-700">
              Aucune date enregistrée pour le moment. Renseignez les anniversaires de vos enfants depuis votre profil parent pour débloquer les surprises.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingBirthdays.map(({ child, formattedDate, daysUntil, nextOccurrence }) => (
                <div key={child.id} className="flex flex-col justify-between rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-purple-500">{formattedDate}</p>
                      <h3 className="text-lg font-bold text-gray-900">{child.full_name}</h3>
                    </div>
                    <div className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      {daysUntil <= 0 ? 'Aujourd\'hui !' : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  {child.birthday_completed ? (
                    <div className="mt-3 flex flex-col gap-3 text-sm text-gray-600">
                      <p>
                        Anniversaire enregistré, planifiez vos surprises pour le {nextOccurrence.toLocaleDateString('fr-FR')}.
                      </p>
                      <button
                        type="button"
                        onClick={() => openBirthdayModal(child)}
                        className="self-start rounded-2xl border border-purple-200 px-3 py-1.5 font-semibold text-purple-600 transition hover:bg-purple-50"
                      >
                        Modifier la date
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                      <p>
                        Date d'anniversaire manquante. Ajoutez-la depuis votre espace parent pour que votre enfant profite des surprises personnalisées.
                      </p>
                      <button
                        type="button"
                        onClick={() => openBirthdayModal(child)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600"
                      >
                        Ajouter la date d'anniversaire
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <PartyPopper className="h-5 w-5 text-pink-500" />
                Invitations reçues
              </h2>
              <p className="text-sm text-gray-600">
                Confirmez la présence de vos enfants aux anniversaires où ils sont invités.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-2xl px-3 py-1 text-sm font-semibold transition ${
                    filter === item.value
                      ? 'bg-purple-500 text-white shadow'
                      : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredInvitations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-purple-200 bg-purple-50 p-6 text-sm text-purple-700">
              {filter === 'pending'
                ? 'Aucune invitation en attente. Vous serez notifié dès qu\'un nouvel événement sera proposé.'
                : 'Aucune invitation correspondant à ce filtre.'}
            </p>
          ) : (
            <div className="grid gap-4">
              {filteredInvitations.map((invitation) => (
                <div key={invitation.id} className="flex flex-col gap-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-pink-50 p-5 shadow">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-pink-500">Invité : {invitation.child_profile?.full_name || 'Enfant'}</p>
                      <h3 className="text-lg font-bold text-gray-900">
                        {invitation.host_child_profile?.full_name || 'Un camarade'} invite à son anniversaire
                      </h3>
                    </div>
                    <div className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                      {new Date(invitation.event_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  {invitation.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-pink-500" />
                      {invitation.location}
                    </div>
                  )}

                  {invitation.message && (
                    <p className="rounded-2xl bg-white/80 p-4 text-sm text-gray-700 shadow-inner">
                      {invitation.message}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>
                        Invitation reçue le{' '}
                        {new Date(invitation.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                      </span>
                    </div>

                    {invitation.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Refuser
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                          className="inline-flex items-center gap-2 rounded-2xl bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-green-600"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Confirmer
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${
                          invitation.status === 'accepted'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {invitation.status === 'accepted' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {invitation.status === 'accepted' ? 'Participation confirmée' : 'Invitation refusée'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
    </div>

      <ChildBirthdayModal
        isOpen={Boolean(selectedChildForBirthday)}
        onClose={closeBirthdayModal}
        onSubmit={handleBirthdaySubmit}
        loading={birthdayModalLoading}
        error={birthdayModalError}
        successMessage={null}
        onResetFeedback={() => setBirthdayModalError(null)}
        defaultBirthday={selectedChildForBirthday?.birthday ?? null}
        mode="parent"
        childName={selectedChildForBirthday?.full_name}
      />
    </div>
  );
}
