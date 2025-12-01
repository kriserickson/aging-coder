

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('#search-posts');

    function searchEntries() {
      const searchQuery = (searchInput.value || '').trim().toLowerCase();

        const posts = document.querySelectorAll('.post-list li');
        posts.forEach(post => {
          if (searchQuery.length > 0) {
            const searchText = ((post.dataset.title || '') + ' ' +
              (post.dataset.tag || '') + ' ' + (post.dataset.summary || '')).toLowerCase();
            if (searchText.indexOf(searchQuery) > -1) {
              post.style.display = 'list-item';
            } else {
              post.style.display = 'none';
            }
          } else {
            post.style.display = 'list-item';
          }
        });
    }


    if (searchInput) {
      searchInput.addEventListener('keyup', e => {
        searchEntries();
      });
    } else {
      console.error('Unable to find search input');
    }

    const clearSearch = document.querySelector('#clear-search');
    if (clearSearch && searchInput) {
      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchEntries();
      });
    }
});
