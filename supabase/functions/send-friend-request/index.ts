import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { targetUserId, senderId } = await req.json();

    if (!targetUserId || !senderId) {
      throw new Error("Missing required fields: targetUserId and senderId");
    }

    if (senderId === targetUserId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Verify sender exists and get their info
    const { data: senderProfile, error: senderError } = await supabase
      .from("profiles")
      .select("id, role, parent_id, full_name")
      .eq("id", senderId)
      .maybeSingle();

    if (senderError || !senderProfile) {
      throw new Error("Sender profile not found");
    }

    // Security check: verify the authenticated user can act on behalf of sender
    const canSend =
      senderId === user.id || // User sending for themselves
      senderProfile.parent_id === user.id; // Parent sending for their child

    if (!canSend) {
      throw new Error("You are not authorized to send requests for this user");
    }

    // Check if friendship already exists (in either direction)
    const { data: existingFriendship } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(user_id.eq.${senderId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${senderId})`)
      .maybeSingle();

    if (existingFriendship) {
      if (existingFriendship.status === "pending") {
        throw new Error("Une demande d'ami est déjà en attente");
      } else if (existingFriendship.status === "accepted") {
        throw new Error("Vous êtes déjà amis");
      } else if (existingFriendship.status === "rejected") {
        // Delete the old rejected request to allow a new one
        await supabase
          .from("friendships")
          .delete()
          .eq("id", existingFriendship.id);
      }
    }

    // Create the friendship request
    const { data: friendship, error: friendshipError } = await supabase
      .from("friendships")
      .insert({
        user_id: senderId,
        friend_id: targetUserId,
        status: "pending"
      })
      .select()
      .single();

    if (friendshipError) {
      console.error("Friendship creation error:", friendshipError);
      throw new Error(`Erreur lors de la création de la demande: ${friendshipError.message}`);
    }

    // Get target profile info
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("parent_id, full_name, role")
      .eq("id", targetUserId)
      .single();

    // Create notification for parent if target is a child
    if (targetProfile?.role === "child" && targetProfile.parent_id) {
      await supabase
        .from("parent_notifications")
        .insert({
          parent_id: targetProfile.parent_id,
          child_id: targetUserId,
          sender_id: senderId,
          notification_type: "friend_request",
          friendship_id: friendship.id,
          content: {
            sender_name: senderProfile.full_name || "Un utilisateur",
            target_name: targetProfile.full_name || "Votre enfant"
          }
        });

      // Create informative notification for the child (no action required)
      await supabase
        .from("friend_request_notifications")
        .insert({
          friendship_id: friendship.id,
          recipient_child_id: targetUserId,
          sender_child_id: senderId,
          notification_type: "pending_approval",
          is_read: false
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        friendship,
        message: "Demande d'ami envoyée avec succès!"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-friend-request:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Une erreur est survenue",
        success: false
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});