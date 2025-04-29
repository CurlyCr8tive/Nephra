import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { 
  forumCategories, 
  forumTopics, 
  forumReplies, 
  forumReactions,
  supportGroups,
  supportGroupMembers,
  supportGroupEvents,
  directMessages,
  users
} from "@shared/schema";
import { 
  insertForumCategorySchema,
  insertForumTopicSchema,
  insertForumReplySchema,
  insertForumReactionSchema,
  insertSupportGroupSchema,
  insertSupportGroupMemberSchema,
  insertSupportGroupEventSchema,
  insertDirectMessageSchema
} from "@shared/schema";

// Create a router
const router = Router();

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized: Please log in to access this resource" });
};

// ========== FORUM ROUTES ==========

// Get all forum categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await db.select().from(forumCategories).where(eq(forumCategories.isActive, true));
    res.json(categories);
  } catch (err) {
    console.error("Error fetching forum categories:", err);
    res.status(500).json({ error: "Failed to fetch forum categories" });
  }
});

// Get topics by category
router.get("/categories/:categoryId/topics", async (req, res) => {
  const { categoryId } = req.params;
  
  try {
    const topics = await db.select({
      topic: forumTopics,
      author: {
        id: users.id,
        username: users.username
      },
      replyCount: sql<number>`count(${forumReplies.id})`.as('reply_count')
    })
    .from(forumTopics)
    .leftJoin(users, eq(forumTopics.userId, users.id))
    .leftJoin(forumReplies, eq(forumTopics.id, forumReplies.topicId))
    .where(eq(forumTopics.categoryId, parseInt(categoryId)))
    .groupBy(forumTopics.id, users.id)
    .orderBy(desc(forumTopics.isPinned), desc(forumTopics.lastReplyAt));
    
    res.json(topics);
  } catch (err) {
    console.error(`Error fetching topics for category ${categoryId}:`, err);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

// Get single topic with replies
router.get("/topics/:topicId", async (req, res) => {
  const { topicId } = req.params;
  
  try {
    // Update view count
    await db.update(forumTopics)
      .set({ views: sql`${forumTopics.views} + 1` })
      .where(eq(forumTopics.id, parseInt(topicId)));
    
    // Get topic details
    const [topic] = await db.select({
      topic: forumTopics,
      author: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(forumTopics)
    .leftJoin(users, eq(forumTopics.userId, users.id))
    .where(eq(forumTopics.id, parseInt(topicId)));
    
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }
    
    // Get replies
    const replies = await db.select({
      reply: forumReplies,
      author: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      },
      likeCount: sql<number>`count(${forumReactions.id})`.as('like_count')
    })
    .from(forumReplies)
    .leftJoin(users, eq(forumReplies.userId, users.id))
    .leftJoin(forumReactions, eq(forumReplies.id, forumReactions.replyId))
    .where(eq(forumReplies.topicId, parseInt(topicId)))
    .groupBy(forumReplies.id, users.id)
    .orderBy(asc(forumReplies.createdAt));
    
    res.json({ topic, replies });
  } catch (err) {
    console.error(`Error fetching topic ${topicId}:`, err);
    res.status(500).json({ error: "Failed to fetch topic" });
  }
});

// Create new topic
router.post("/topics", ensureAuthenticated, async (req, res) => {
  try {
    const validatedData = insertForumTopicSchema.parse(req.body);
    
    // Add user ID from session
    const topicData = {
      ...validatedData,
      userId: req.user.id
    };
    
    // Create topic
    const [newTopic] = await db.insert(forumTopics)
      .values(topicData)
      .returning();
    
    res.status(201).json(newTopic);
  } catch (err) {
    console.error("Error creating forum topic:", err);
    res.status(500).json({ error: "Failed to create forum topic" });
  }
});

// Create new reply
router.post("/topics/:topicId/replies", ensureAuthenticated, async (req, res) => {
  const { topicId } = req.params;
  
  try {
    const validatedData = insertForumReplySchema.parse(req.body);
    
    // Add user ID from session and topic ID from params
    const replyData = {
      ...validatedData,
      userId: req.user.id,
      topicId: parseInt(topicId)
    };
    
    // Create reply
    const [newReply] = await db.insert(forumReplies)
      .values(replyData)
      .returning();
    
    // Update last reply timestamp on topic
    await db.update(forumTopics)
      .set({ lastReplyAt: new Date(), updatedAt: new Date() })
      .where(eq(forumTopics.id, parseInt(topicId)));
    
    res.status(201).json(newReply);
  } catch (err) {
    console.error(`Error creating reply for topic ${topicId}:`, err);
    res.status(500).json({ error: "Failed to create reply" });
  }
});

// Add reaction to a post/reply
router.post("/replies/:replyId/react", ensureAuthenticated, async (req, res) => {
  const { replyId } = req.params;
  const { reactionType } = req.body;
  
  try {
    // Check if user already reacted
    const existingReaction = await db.select()
      .from(forumReactions)
      .where(
        and(
          eq(forumReactions.replyId, parseInt(replyId)),
          eq(forumReactions.userId, req.user.id)
        )
      );
    
    if (existingReaction.length > 0) {
      return res.status(400).json({ error: "You have already reacted to this post" });
    }
    
    // Create reaction
    const [reaction] = await db.insert(forumReactions)
      .values({
        replyId: parseInt(replyId),
        userId: req.user.id,
        reactionType
      })
      .returning();
    
    res.status(201).json(reaction);
  } catch (err) {
    console.error(`Error adding reaction to reply ${replyId}:`, err);
    res.status(500).json({ error: "Failed to add reaction" });
  }
});

// ========== SUPPORT GROUP ROUTES ==========

// Get all support groups (with filtering)
router.get("/groups", async (req, res) => {
  const { type, isPrivate } = req.query;
  
  try {
    let query = db.select({
      group: supportGroups,
      creator: {
        id: users.id,
        username: users.username
      },
      memberCount: sql<number>`count(${supportGroupMembers.id})`.as('member_count')
    })
    .from(supportGroups)
    .leftJoin(users, eq(supportGroups.creatorId, users.id))
    .leftJoin(supportGroupMembers, eq(supportGroups.id, supportGroupMembers.groupId))
    .groupBy(supportGroups.id, users.id);
    
    // Apply filters if provided
    if (type) {
      query = query.where(eq(supportGroups.type, type as string));
    }
    
    if (isPrivate !== undefined) {
      query = query.where(eq(supportGroups.isPrivate, isPrivate === 'true'));
    }
    
    const groups = await query.orderBy(desc(supportGroups.createdAt));
    res.json(groups);
  } catch (err) {
    console.error("Error fetching support groups:", err);
    res.status(500).json({ error: "Failed to fetch support groups" });
  }
});

// Get single support group details
router.get("/groups/:groupId", async (req, res) => {
  const { groupId } = req.params;
  
  try {
    // Get group details
    const [group] = await db.select({
      group: supportGroups,
      creator: {
        id: users.id,
        username: users.username
      }
    })
    .from(supportGroups)
    .leftJoin(users, eq(supportGroups.creatorId, users.id))
    .where(eq(supportGroups.id, parseInt(groupId)));
    
    if (!group) {
      return res.status(404).json({ error: "Support group not found" });
    }
    
    // Get members
    const members = await db.select({
      member: supportGroupMembers,
      user: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(supportGroupMembers)
    .leftJoin(users, eq(supportGroupMembers.userId, users.id))
    .where(eq(supportGroupMembers.groupId, parseInt(groupId)));
    
    // Get upcoming events
    const events = await db.select({
      event: supportGroupEvents,
      creator: {
        id: users.id,
        username: users.username
      }
    })
    .from(supportGroupEvents)
    .leftJoin(users, eq(supportGroupEvents.creatorId, users.id))
    .where(
      and(
        eq(supportGroupEvents.groupId, parseInt(groupId)),
        sql`${supportGroupEvents.startTime} >= NOW()`
      )
    )
    .orderBy(asc(supportGroupEvents.startTime))
    .limit(5);
    
    res.json({ group, members, events });
  } catch (err) {
    console.error(`Error fetching support group ${groupId}:`, err);
    res.status(500).json({ error: "Failed to fetch support group" });
  }
});

// Create support group
router.post("/groups", ensureAuthenticated, async (req, res) => {
  try {
    const validatedData = insertSupportGroupSchema.parse(req.body);
    
    // Add creator ID from session
    const groupData = {
      ...validatedData,
      creatorId: req.user.id
    };
    
    // Create group
    const [newGroup] = await db.insert(supportGroups)
      .values(groupData)
      .returning();
    
    // Add creator as admin member
    await db.insert(supportGroupMembers)
      .values({
        groupId: newGroup.id,
        userId: req.user.id,
        role: "admin",
        status: "active"
      });
    
    res.status(201).json(newGroup);
  } catch (err) {
    console.error("Error creating support group:", err);
    res.status(500).json({ error: "Failed to create support group" });
  }
});

// Join support group
router.post("/groups/:groupId/join", ensureAuthenticated, async (req, res) => {
  const { groupId } = req.params;
  
  try {
    // Check if user is already a member
    const existingMember = await db.select()
      .from(supportGroupMembers)
      .where(
        and(
          eq(supportGroupMembers.groupId, parseInt(groupId)),
          eq(supportGroupMembers.userId, req.user.id)
        )
      );
    
    if (existingMember.length > 0) {
      return res.status(400).json({ error: "You are already a member of this group" });
    }
    
    // Check if group is private
    const [group] = await db.select()
      .from(supportGroups)
      .where(eq(supportGroups.id, parseInt(groupId)));
    
    if (!group) {
      return res.status(404).json({ error: "Support group not found" });
    }
    
    // For private groups, set status to pending
    const status = group.isPrivate ? "pending" : "active";
    
    // Add user to group
    const [membership] = await db.insert(supportGroupMembers)
      .values({
        groupId: parseInt(groupId),
        userId: req.user.id,
        role: "member",
        status
      })
      .returning();
    
    res.status(201).json(membership);
  } catch (err) {
    console.error(`Error joining support group ${groupId}:`, err);
    res.status(500).json({ error: "Failed to join support group" });
  }
});

// ========== DIRECT MESSAGING ROUTES ==========

// Get conversations for current user
router.get("/messages/conversations", ensureAuthenticated, async (req, res) => {
  try {
    // This query gets the latest message from each conversation
    const conversations = await db.execute(sql`
      WITH latest_messages AS (
        SELECT DISTINCT ON (
          CASE
            WHEN sender_id = ${req.user.id} THEN recipient_id
            ELSE sender_id
          END
        )
        dm.*,
        CASE
          WHEN sender_id = ${req.user.id} THEN recipient_id
          ELSE sender_id
        END AS other_user_id,
        ROW_NUMBER() OVER (
          PARTITION BY 
            CASE
              WHEN sender_id = ${req.user.id} THEN recipient_id
              ELSE sender_id
            END
          ORDER BY created_at DESC
        ) AS rn
        FROM direct_messages dm
        WHERE sender_id = ${req.user.id} OR recipient_id = ${req.user.id}
        ORDER BY other_user_id, created_at DESC
      )
      SELECT 
        lm.*,
        u.username,
        u.first_name,
        u.last_name
      FROM latest_messages lm
      JOIN users u ON u.id = lm.other_user_id
      WHERE lm.rn = 1
      ORDER BY lm.created_at DESC
    `);
    
    res.json(conversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get messages between current user and another user
router.get("/messages/:userId", ensureAuthenticated, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const messages = await db.select()
      .from(directMessages)
      .where(
        sql`
          (sender_id = ${req.user.id} AND recipient_id = ${parseInt(userId)})
          OR
          (sender_id = ${parseInt(userId)} AND recipient_id = ${req.user.id})
        `
      )
      .orderBy(asc(directMessages.createdAt));
    
    // Mark messages as read
    await db.update(directMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(directMessages.recipientId, req.user.id),
          eq(directMessages.senderId, parseInt(userId)),
          eq(directMessages.isRead, false)
        )
      );
    
    res.json(messages);
  } catch (err) {
    console.error(`Error fetching messages with user ${userId}:`, err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/messages", ensureAuthenticated, async (req, res) => {
  try {
    const validatedData = insertDirectMessageSchema.parse(req.body);
    
    // Add sender ID from session
    const messageData = {
      ...validatedData,
      senderId: req.user.id
    };
    
    // Create message
    const [newMessage] = await db.insert(directMessages)
      .values(messageData)
      .returning();
    
    res.status(201).json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;