-- Create a function for optimized article search 
-- This function uses PostgreSQL's full-text search capabilities
CREATE OR REPLACE FUNCTION search_articles(
    search_query TEXT,
    max_results INTEGER DEFAULT 5
)
RETURNS SETOF education_articles
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create temporary search config from query terms
    RETURN QUERY
    WITH processed_query AS (
        SELECT to_tsquery('english', string_agg(lexeme, ' | ')) AS query
        FROM unnest(regexp_split_to_array(search_query, '\s+')) AS lexeme
        WHERE length(lexeme) > 2
    ),
    matching_articles AS (
        SELECT 
            ea.*,
            ts_rank(
                to_tsvector('english', ea.title || ' ' || ea.summary), 
                (SELECT query FROM processed_query)
            ) AS relevance_title_summary,
            -- Boost score if tags match (×3)
            CASE WHEN EXISTS (
                SELECT 1 FROM unnest(ea.user_focus_tags) tag
                WHERE tag ILIKE ANY(regexp_split_to_array(search_query, '\s+'))
            ) THEN 3 ELSE 0 END AS tag_boost,
            -- Boost score if category matches query (×2)
            CASE WHEN ea.category ILIKE ANY(regexp_split_to_array(search_query, '\s+')) 
                THEN 2 ELSE 0 END AS category_boost
        FROM 
            education_articles ea
        WHERE 
            to_tsvector('english', ea.title || ' ' || ea.summary) @@ (SELECT query FROM processed_query)
            OR EXISTS (
                SELECT 1 FROM unnest(ea.user_focus_tags) tag
                WHERE tag ILIKE ANY(regexp_split_to_array(search_query, '\s+'))
            )
            OR ea.category ILIKE ANY(regexp_split_to_array(search_query, '\s+'))
    )
    SELECT 
        ma.*
    FROM 
        matching_articles ma
    ORDER BY 
        (ma.relevance_title_summary + ma.tag_boost + ma.category_boost) DESC,
        ma.published_date DESC
    LIMIT max_results;
END;
$$;

-- Create a function to get related articles
CREATE OR REPLACE FUNCTION get_related_articles(
    article_id BIGINT,
    max_results INTEGER DEFAULT 3
)
RETURNS SETOF education_articles
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH source_article AS (
        SELECT 
            title, 
            category, 
            user_focus_tags
        FROM 
            education_articles
        WHERE 
            id = article_id
    ),
    tag_related AS (
        SELECT 
            ea.*,
            -- Count matching tags
            (
                SELECT COUNT(*)
                FROM unnest(ea.user_focus_tags) t1,
                     unnest((SELECT user_focus_tags FROM source_article)) t2
                WHERE t1 = t2
            ) AS tag_match_count
        FROM 
            education_articles ea
        WHERE 
            ea.id <> article_id
            AND EXISTS (
                SELECT 1
                FROM unnest(ea.user_focus_tags) t1,
                     unnest((SELECT user_focus_tags FROM source_article)) t2
                WHERE t1 = t2
            )
    )
    SELECT 
        tr.*
    FROM 
        tag_related tr
    ORDER BY 
        tr.tag_match_count DESC,
        CASE WHEN tr.category = (SELECT category FROM source_article) THEN 1 ELSE 0 END DESC,
        tr.published_date DESC
    LIMIT max_results;
END;
$$;

-- Create a function to get articles by tag
CREATE OR REPLACE FUNCTION get_articles_by_tag(
    tag_name TEXT,
    max_results INTEGER DEFAULT 10
)
RETURNS SETOF education_articles
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ea.*
    FROM 
        education_articles ea
    WHERE 
        tag_name = ANY(ea.user_focus_tags)
    ORDER BY 
        ea.published_date DESC
    LIMIT max_results;
END;
$$;