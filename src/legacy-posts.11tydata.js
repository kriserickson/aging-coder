module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      // 1. Safety Check: If pagination is empty or failing, do not write a file.
      if (!data.post || !data.post.date) {
        return false;
      }

      // 2. Safety Check: Never accidentally overwrite your homepage
      if (data.post.url === "/") {
        return false;
      }

      // 3. Generate the Date Strings manually
      // We do this manually to ensure it matches your old format exactly
      const d = new Date(data.post.date);
      // Use UTC methods to ensure dates don't shift due to timezone
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");

      // 4. Return the OLD path format
      // Result: posts/2015-03-07-my-post-slug/index.html
      return `posts/${year}-${month}-${day}-${data.post.fileSlug}/index.html`;
    }
  }
};
