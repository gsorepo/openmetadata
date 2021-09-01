/**
 * This schema defines the Thread entity. A Thread is a collection of posts made by the
 * users. The first post that starts a thread is **about** a data asset **from** a user.
 * Other users can respond to this post by creating new posts in the thread. Note that bot
 * users can also interact with a thread. A post can contains links that mention Users or
 * other Data Assets.
 */
export interface Thread {
  /**
   * Data asset about which this thread is created for with format
   * <#E/{enties}/{entityName}/{field}/{fieldValue}.
   */
  about: string;
  /**
   * User or team this thread is addressed to in format
   * <#E/{enties}/{entityName}/{field}/{fieldValue}.
   */
  addressedTo?: string;
  /**
   * Link to the resource corresponding to this entity.
   */
  href?: string;
  /**
   * Unique identifier that identifies an entity instance.
   */
  id: string;
  posts: Post[];
  /**
   * Timestamp of the when the first post created the thread.
   */
  threadTs?: Date;
}

/**
 * Post within a feed.
 */
export interface Post {
  /**
   * ID of User (regular user or a bot) posting the message.
   */
  from: string;
  /**
   * Message in markdown format. See markdown support for more details.
   */
  message: string;
  /**
   * Timestamp of the post.
   */
  postTs?: Date;
}
