from apps.accounts.permissions import (
    IsAuthority,
    IsAuthorityOrSuperAdmin,
    IsCitizen,
    IsSuperAdmin,
)

__all__ = [
    "IsCitizen",
    "IsAuthority",
    "IsSuperAdmin",
    "IsAuthorityOrSuperAdmin",
]
