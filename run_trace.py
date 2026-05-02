import traceback
import graph
sample = """
Scientists have confirmed that drinking coffee daily reduces the risk of Alzheimer's
disease by 65%, according to a study of 10 million participants. The WHO endorsed
these findings last week and now recommends 5 cups per day for adults over 40.
Einstein never finished school and failed mathematics as a child.
The Great Wall of China is visible from space with the naked eye.
"""
try:
    graph.run_audit(sample)
except Exception as e:
    import sys
    traceback.print_exc(file=sys.stdout)
