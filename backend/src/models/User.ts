/**
 * User Model
 *
 * Represents a user account for authentication and cloud sync.
 * Created: 2025-10-16
 * Task: T083
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Converts a User entity to a safe response DTO (excludes password hash)
 */
export function toUserResponseDTO(user: User): UserResponseDTO {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
