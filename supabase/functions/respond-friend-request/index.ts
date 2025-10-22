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

    const { notificationId, action } = await req.json();

    if (!notificationId || !action) {
      throw new Error("Missing notificationId or action");
    }

    if (action !== "accept" && action !== "reject") {
      throw new Error("Invalid action. Must be 'accept' or 'reject'");
    }

    const { data: notification, error: notifError } = await supabase
      .from("parent_notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("parent_id", user.id)
      .single();

    if (notifError || !notification) {
      throw new Error("Notification not found or unauthorized");
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    const { error: updateError } = await supabase
      .from("friendships")
      .update({ status: newStatus })
      .eq("id", notification.friendship_id);

    if (updateError) {
      throw updateError;
    }

    await supabase
      .from("parent_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (action === "accept") {
      await supabase
        .from("activity_feed")
        .insert([
          {
            user_id: notification.child_id,
            activity_type: "friend_added",
            content: { friend_name: notification.content.sender_name }
          },
          {
            user_id: notification.sender_id,
            activity_type: "friend_added",
            content: { friend_name: notification.content.target_name }
          }
        ]);

      // Create notification for both children that parent accepted
      await supabase
        .from("friend_request_notifications")
        .insert([
          {
            friendship_id: notification.friendship_id,
            recipient_child_id: notification.child_id,
            sender_child_id: notification.sender_id,
            notification_type: "accepted_by_parent",
            is_read: false
          },
          {
            friendship_id: notification.friendship_id,
            recipient_child_id: notification.sender_id,
            sender_child_id: notification.child_id,
            notification_type: "accepted_by_parent",
            is_read: false
          }
        ]);
    } else {
      // Create notification for both children that parent rejected
      await supabase
        .from("friend_request_notifications")
        .insert([
          {
            friendship_id: notification.friendship_id,
            recipient_child_id: notification.child_id,
            sender_child_id: notification.sender_id,
            notification_type: "rejected_by_parent",
            is_read: false
          },
          {
            friendship_id: notification.friendship_id,
            recipient_child_id: notification.sender_id,
            sender_child_id: notification.child_id,
            notification_type: "rejected_by_parent",
            is_read: false
          }
        ]);
    }

    return new Response(
      JSON.stringify({ success: true, action: newStatus }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in respond-friend-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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