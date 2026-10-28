import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/entities/user.entity';

const dateTimeType =
  process.env.DB_TYPE === 'postgres' ||
  /^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL ?? process.env.DB_DATABASE ?? '')
    ? 'timestamp'
    : 'datetime';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @Index()
  @Column({ type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: dateTimeType, nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: dateTimeType, nullable: true })
  revokedAt: Date | null;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;
}
