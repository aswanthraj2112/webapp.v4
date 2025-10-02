# ElastiCache configuration - using existing cluster values
# Include ALL subnets from existing subnet group to avoid modification conflicts
cache_subnet_ids = [
  "subnet-05d0352bb15852524",
  "subnet-04cc288ea3b2e1e53", 
  "subnet-08e89ff0d9b49c9ae",
  "subnet-075811427d5564cf9",
  "subnet-07ea9e4f9cc9159ca",
  "subnet-05a3b8177138c8b14",
  "subnet-04ca053dcbe5f49cc"
]

cache_security_group_ids = [
  "sg-078997505ad1c6bbc",
  "sg-07707a36aa1599475"
]

# Match existing cluster configuration
elasticache_node_type = "cache.t4g.micro"