import axios, { type AxiosError, type AxiosRequestConfig } from "axios"
import { sanitizeInput } from "../utils"

const API_BASE_URL = import.meta.env.VITE_API_URL

interface ChatRequest {
  message: string
}

interface ChatResponse {
  response: string
}

interface ApiError {
  error: string
  code?: string
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      const message = error.response.data?.error || "Server error occurred"
      const status = error.response.status

      if (status === 401) {
        localStorage.removeItem("auth_token")
        window.location.href = "/login"
      }

      if (status === 429) {
        throw new Error("Too many requests. Please wait a moment.")
      }

      if (status >= 500) {
        throw new Error("Server is taking a break. Please try again.")
      }

      throw new Error(message)
    }

    if (error.code === "ECONNABORTED") {
      throw new Error("Request timed out. Please check your connection.")
    }

    if (!navigator.onLine) {
      throw new Error("You're offline. Please check your connection.")
    }

    throw new Error("Unable to connect. Please try again.")
  }
)

export async function promptOpenai(data: ChatRequest): Promise<ChatResponse> {
  const sanitizedMessage = sanitizeInput(data.message)

  if (!sanitizedMessage || sanitizedMessage.length < 1) {
    throw new Error("Please enter a message")
  }

  if (sanitizedMessage.length > 1000) {
    throw new Error("Message is too long. Maximum 1000 characters allowed.")
  }

  const config: AxiosRequestConfig = {
    timeout: 30000,
  }

  const response = await apiClient.post<ChatResponse>(
    "/api/chat_with_unihelp/",
    { message: sanitizedMessage },
    config
  )

  return response.data
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    await apiClient.get("/health/", { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

export default apiClient
