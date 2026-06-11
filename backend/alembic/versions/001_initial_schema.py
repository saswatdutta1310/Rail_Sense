"""
Alembic Migration: Initial schema creation for RailSense AI

This migration creates all 7 core tables:
- users: User accounts with role-based access
- stations: Railway stations with GPS and infrastructure info
- trains: Trains with multilingual support
- delay_predictions: ML predictions of train delays
- platform_analyses: Computer vision platform safety analysis
- track_analyses: Computer vision track defect analysis
- sms_subscriptions: User SMS alert subscriptions
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# migration identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """
    Create all tables with indexes and constraints
    """
    
    # Create ENUM types for PostgreSQL (SQLite uses TEXT fallback via CheckConstraint)
    try:
        sa.Enum('public', 'operator', 'admin', 'superadmin', name='roleenum').create(op.get_bind(), checkfirst=True)
        sa.Enum('low', 'medium', 'high', 'critical', name='alertlevelenm').create(op.get_bind(), checkfirst=True)
        sa.Enum('low', 'medium', 'high', name='prioritylevelenm').create(op.get_bind(), checkfirst=True)
    except Exception:
        # SQLite doesn't support ENUM, will use TEXT with CHECK constraint
        pass

    # users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='public'),
        sa.Column('station_id', sa.String(36), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_user_email')
    )
    op.create_index('idx_user_email', 'users', ['email'])
    op.create_index('idx_user_role', 'users', ['role'])
    op.create_index('idx_user_station_id', 'users', ['station_id'])

    # stations table
    op.create_table(
        'stations',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('station_code', sa.String(20), nullable=False, unique=True),
        sa.Column('station_name', sa.String(255), nullable=False),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('state', sa.String(100), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('platform_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('has_cctv', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('zone', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('station_code', name='uq_station_code')
    )
    op.create_index('idx_station_code', 'stations', ['station_code'])
    op.create_index('idx_station_city', 'stations', ['city'])
    op.create_index('idx_station_zone', 'stations', ['zone'])

    # trains table
    op.create_table(
        'trains',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('train_number', sa.String(20), nullable=False, unique=True),
        sa.Column('train_name', sa.String(255), nullable=False),
        sa.Column('name_translations', sa.JSON(), nullable=True),
        sa.Column('origin_station_id', sa.String(36), nullable=False),
        sa.Column('destination_station_id', sa.String(36), nullable=False),
        sa.Column('train_type', sa.String(50), nullable=False),
        sa.Column('typical_duration_min', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['origin_station_id'], ['stations.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['destination_station_id'], ['stations.id'], ondelete='RESTRICT'),
        sa.UniqueConstraint('train_number', name='uq_train_number')
    )
    op.create_index('idx_train_number', 'trains', ['train_number'])
    op.create_index('idx_train_origin', 'trains', ['origin_station_id'])
    op.create_index('idx_train_destination', 'trains', ['destination_station_id'])
    op.create_index('idx_train_type', 'trains', ['train_type'])

    # delay_predictions table
    op.create_table(
        'delay_predictions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('train_id', sa.String(36), nullable=False),
        sa.Column('predicted_delay_min', sa.Integer(), nullable=False),
        sa.Column('confidence_pct', sa.Float(), nullable=False),
        sa.Column('root_causes', sa.JSON(), nullable=False),
        sa.Column('weather_input', sa.JSON(), nullable=False),
        sa.Column('signal_status', sa.String(50), nullable=False),
        sa.Column('congestion_level', sa.Float(), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('predicted_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('requested_by_ip', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['train_id'], ['trains.id'], ondelete='CASCADE')
    )
    op.create_index('idx_delay_train_id', 'delay_predictions', ['train_id'])
    op.create_index('idx_delay_predicted_at', 'delay_predictions', ['predicted_at'])
    op.create_index('idx_delay_confidence', 'delay_predictions', ['confidence_pct'])

    # platform_analyses table
    op.create_table(
        'platform_analyses',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('station_id', sa.String(36), nullable=False),
        sa.Column('platform_number', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('alert_level', sa.String(50), nullable=False),
        sa.Column('crowd_density', sa.Float(), nullable=False),
        sa.Column('fall_detected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('person_count', sa.Integer(), nullable=False),
        sa.Column('detection_metadata', sa.JSON(), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('operator_id', sa.String(36), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['station_id'], ['stations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['operator_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('idx_platform_station_id', 'platform_analyses', ['station_id'])
    op.create_index('idx_platform_alert_level', 'platform_analyses', ['alert_level'])
    op.create_index('idx_platform_analyzed_at', 'platform_analyses', ['analyzed_at'])

    # track_analyses table
    op.create_table(
        'track_analyses',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('track_segment_ref', sa.String(100), nullable=True),
        sa.Column('annotated_image_url', sa.String(500), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=False),
        sa.Column('priority_level', sa.String(50), nullable=False),
        sa.Column('defect_count', sa.Integer(), nullable=False),
        sa.Column('defects', sa.JSON(), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('engineer_id', sa.String(36), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['engineer_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('idx_track_risk_score', 'track_analyses', ['risk_score'])
    op.create_index('idx_track_priority', 'track_analyses', ['priority_level'])
    op.create_index('idx_track_analyzed_at', 'track_analyses', ['analyzed_at'])

    # sms_subscriptions table
    op.create_table(
        'sms_subscriptions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('phone_number', sa.String(20), nullable=False),
        sa.Column('train_id', sa.String(36), nullable=False),
        sa.Column('language_code', sa.String(10), nullable=False, server_default='en'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('subscribed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_alerted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['train_id'], ['trains.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('phone_number', 'train_id', name='uq_phone_train')
    )
    op.create_index('idx_sms_phone_number', 'sms_subscriptions', ['phone_number'])
    op.create_index('idx_sms_is_active', 'sms_subscriptions', ['is_active'])
    op.create_index('idx_sms_train_id', 'sms_subscriptions', ['train_id'])

def downgrade() -> None:
    """
    Drop all tables and types
    """
    op.drop_table('sms_subscriptions')
    op.drop_table('track_analyses')
    op.drop_table('platform_analyses')
    op.drop_table('delay_predictions')
    op.drop_table('trains')
    op.drop_table('stations')
    op.drop_table('users')
    
    # Drop ENUM types
    try:
        sa.Enum('public', 'operator', 'admin', 'superadmin', name='roleenum').drop(op.get_bind())
        sa.Enum('low', 'medium', 'high', 'critical', name='alertlevelenm').drop(op.get_bind())
        sa.Enum('low', 'medium', 'high', name='prioritylevelenm').drop(op.get_bind())
    except Exception:
        pass
