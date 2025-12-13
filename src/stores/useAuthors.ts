import { defineStore } from 'pinia'
import { services } from '@/api/services'
import { indexedDB } from '@/utils/storage'
import type { AuthorListItem, PaginatedResponse } from '@/types'

export const useAuthorsStore = defineStore('authors', () => {
  async function getAuthors(params?: { page?: number; page_size?: number; platform?: string }) {
    const response = await services.authors.getAuthors(params)
    try {
      if (response?.items?.length) {
        await indexedDB.saveAuthors(response.items as AuthorListItem[])
      }
    } catch (err) {
      void err
    }
    return response as PaginatedResponse<AuthorListItem>
  }

  return {
    getAuthors,
  }
})
